from uuid import uuid4

from backend.repositories.iniciativas import IniciativaRepository, iniciativa_repository
from backend.schemas.iniciativas import (
    Iniciativa,
    IniciativaConParticipacion,
    IniciativaCreate,
    IniciativaUpdate,
)
from backend.schemas.usuarios import UsuarioDB
from backend.services.exceptions import (
    AccesoDenegadoError,
    ConflictoError,
    NoEncontradoError,
    SolicitudIncorrectaError,
)
from backend.services.zonas import ZonaService, zona_service


class IniciativaService:
    """Reglas de negocio de las iniciativas vecinales."""

    def __init__(
        self,
        repository: IniciativaRepository | None = None,
        zonas: ZonaService | None = None,
    ) -> None:
        self._repository = repository or iniciativa_repository
        self._zonas = zonas or zona_service

    def _buscar(self, id_iniciativa: str) -> Iniciativa:
        iniciativa = self._repository.get(id_iniciativa)
        if iniciativa is None:
            raise NoEncontradoError("una iniciativa", id_iniciativa)
        return iniciativa

    def _con_participacion(
        self, iniciativa: Iniciativa, usuario: UsuarioDB
    ) -> IniciativaConParticipacion:
        return IniciativaConParticipacion(
            **iniciativa.model_dump(),
            sumado=usuario.id in self._repository.participantes_de(iniciativa.id),
            es_mia=iniciativa.id_creador == usuario.id,
        )

    # --- consultas ---
    def listar(self, usuario: UsuarioDB, id_barrio: str | None = None) -> list[IniciativaConParticipacion]:
        iniciativas = self._repository.list()
        if id_barrio:
            iniciativas = [i for i in iniciativas if i.id_barrio == id_barrio]
        return [self._con_participacion(i, usuario) for i in iniciativas]

    def obtener(self, id_iniciativa: str, usuario: UsuarioDB) -> IniciativaConParticipacion:
        return self._con_participacion(self._buscar(id_iniciativa), usuario)

    # --- CRUD ---
    def crear(self, datos: IniciativaCreate, usuario: UsuarioDB) -> Iniciativa:
        if usuario.id_barrio is None:
            raise SolicitudIncorrectaError("No tienes un barrio asignado.")
        temperatura = (
            self._zonas.temperatura_de(usuario.id_barrio) if datos.estado == "Cumplida" else None
        )
        iniciativa = Iniciativa(
            **datos.model_dump(),
            id=f"i_{uuid4().hex[:8]}",
            id_barrio=usuario.id_barrio,
            id_creador=usuario.id,
            participantes=0,
            temperatura_al_cumplir=temperatura,
        )
        return self._repository.add(iniciativa)

    def actualizar(self, id_iniciativa: str, datos: IniciativaUpdate, usuario: UsuarioDB) -> Iniciativa:
        iniciativa = self._buscar(id_iniciativa)
        if iniciativa.id_creador != usuario.id:
            raise AccesoDenegadoError("Solo puedes editar tus propias iniciativas.")
        if iniciativa.estado == "Cumplida" and datos.estado != "Cumplida":
            raise SolicitudIncorrectaError("Una iniciativa cumplida no puede reabrirse.")
        cambios: dict = datos.model_dump()
        if datos.estado == "Cumplida" and iniciativa.temperatura_al_cumplir is None:
            cambios["temperatura_al_cumplir"] = self._zonas.temperatura_de(iniciativa.id_barrio)
        return self._repository.update(iniciativa.model_copy(update=cambios))

    def eliminar(self, id_iniciativa: str, usuario: UsuarioDB) -> None:
        iniciativa = self._buscar(id_iniciativa)
        # La puede borrar quien la creó o la Municipalidad (moderación).
        if iniciativa.id_creador != usuario.id and usuario.rol != "municipalidad":
            raise AccesoDenegadoError("Solo puedes eliminar tus propias iniciativas.")
        self._repository.delete(id_iniciativa)

    # --- participación ---
    def sumarse(self, id_iniciativa: str, usuario: UsuarioDB) -> Iniciativa:
        iniciativa = self._buscar(id_iniciativa)
        if iniciativa.estado in ("Cumplida", "Cancelada"):
            raise SolicitudIncorrectaError("Esta iniciativa ya está cerrada.")
        participantes = self._repository.participantes_de(id_iniciativa)
        if usuario.id in participantes:
            raise ConflictoError("Ya participas en esta iniciativa.")
        participantes.add(usuario.id)
        return self._repository.update(
            iniciativa.model_copy(update={"participantes": iniciativa.participantes + 1})
        )


iniciativa_service = IniciativaService()
