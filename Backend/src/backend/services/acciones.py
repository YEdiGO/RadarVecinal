from datetime import UTC, date, datetime
from uuid import uuid4

from backend.repositories.acciones import AccionRepository, accion_repository
from backend.repositories.barrios import BarrioRepository, barrio_repository
from backend.repositories.reportes import ReporteRepository, reporte_repository
from backend.schemas.acciones import (
    Accion,
    AccionCreate,
    AccionUpdate,
    CambioEstadoAccion,
)
from backend.schemas.usuarios import UsuarioDB
from backend.services.exceptions import (
    AccesoDenegadoError,
    ConflictoError,
    NoEncontradoError,
    SolicitudIncorrectaError,
)
from backend.services.zonas import ZonaService, zona_service


def _fecha_a_datetime(dia: date) -> datetime:
    """Guarda la fecha al mediodía UTC para que no cambie de día según la zona horaria."""
    return datetime(dia.year, dia.month, dia.day, 12, 0, tzinfo=UTC)


def _normalizar(texto: str) -> str:
    return " ".join(texto.lower().split())


class AccionService:
    """Reglas de negocio de las acciones que registra la Municipalidad."""

    def __init__(
        self,
        repository: AccionRepository | None = None,
        barrios: BarrioRepository | None = None,
        zonas: ZonaService | None = None,
        reportes: ReporteRepository | None = None,
    ) -> None:
        self._repository = repository or accion_repository
        self._barrios = barrios or barrio_repository
        self._zonas = zonas or zona_service
        self._reportes = reportes or reporte_repository

    def _buscar(self, id_accion: str) -> Accion:
        accion = self._repository.get(id_accion)
        if accion is None:
            raise NoEncontradoError("una acción", id_accion)
        return accion

    def _propia(self, id_accion: str, usuario: UsuarioDB) -> Accion:
        accion = self._buscar(id_accion)
        if accion.id_autoridad != usuario.id:
            raise AccesoDenegadoError("Solo puedes modificar tus propias acciones.")
        return accion

    def _validar_barrio(self, id_barrio: str) -> None:
        if self._barrios.get(id_barrio) is None:
            raise SolicitudIncorrectaError("Selecciona un barrio válido.")

    def _barrio_del_reporte(self, id_reporte: str | None) -> str | None:
        """Si la acción responde a un reporte, se valida y se usa el barrio del reporte."""
        if not id_reporte:
            return None
        reporte = self._reportes.get(id_reporte)
        if reporte is None:
            raise NoEncontradoError("un reporte", id_reporte)
        return reporte.id_barrio

    def _revisar_duplicado(
        self, datos: AccionCreate | AccionUpdate, id_actual: str | None = None
    ) -> None:
        """Evita registrar dos veces la misma acción por un doble clic o un reenvío."""
        for a in self._repository.list():
            if a.id == id_actual:
                continue
            if (
                a.id_barrio == datos.id_barrio
                and a.tipo == datos.tipo
                and _normalizar(a.titulo) == _normalizar(datos.titulo)
            ):
                raise ConflictoError(
                    "Ya existe una acción con ese título y tipo en este barrio. "
                    "Edita la existente en lugar de crear otra."
                )

    # --- consultas ---
    def listar(self, id_barrio: str | None = None) -> list[Accion]:
        acciones = self._repository.list()
        if id_barrio:
            acciones = [a for a in acciones if a.id_barrio == id_barrio]
        return sorted(acciones, key=lambda a: a.fecha, reverse=True)

    def obtener(self, id_accion: str) -> Accion:
        return self._buscar(id_accion)

    # --- CRUD ---
    def crear(self, datos: AccionCreate, usuario: UsuarioDB) -> Accion:
        barrio_del_reporte = self._barrio_del_reporte(datos.id_reporte)
        id_barrio = barrio_del_reporte or datos.id_barrio
        self._validar_barrio(id_barrio)
        self._revisar_duplicado(datos.model_copy(update={"id_barrio": id_barrio}))
        # "Antes/después": se guarda la temperatura del barrio al completar la acción.
        temperatura = self._zonas.temperatura_de(id_barrio) if datos.estado == "Completada" else None
        accion = Accion(
            **datos.model_dump(exclude={"fecha", "id_reporte"}),
            id_barrio=id_barrio,
            fecha=_fecha_a_datetime(datos.fecha),
            id=f"a_{uuid4().hex[:8]}",
            id_autoridad=usuario.id,
            institucion=usuario.institucion or "Municipalidad",
            id_reporte=datos.id_reporte,
            fecha_registro=datetime.now(UTC),
            temperatura_al_completar=temperatura,
        )
        return self._repository.add(accion)

    def actualizar(self, id_accion: str, datos: AccionUpdate, usuario: UsuarioDB) -> Accion:
        accion = self._propia(id_accion, usuario)
        barrio_del_reporte = self._barrio_del_reporte(datos.id_reporte)
        id_barrio = barrio_del_reporte or datos.id_barrio
        self._validar_barrio(id_barrio)
        self._validar_estado(accion, datos.estado)
        self._revisar_duplicado(datos.model_copy(update={"id_barrio": id_barrio}), id_accion)
        cambios = {
            **datos.model_dump(exclude={"fecha"}),
            "id_barrio": id_barrio,
            "fecha": _fecha_a_datetime(datos.fecha),
        }
        if datos.estado == "Completada" and accion.estado != "Completada":
            cambios["temperatura_al_completar"] = self._zonas.temperatura_de(id_barrio)
        return self._repository.update(accion.model_copy(update=cambios))

    def cambiar_estado(
        self, id_accion: str, datos: CambioEstadoAccion, usuario: UsuarioDB
    ) -> Accion:
        accion = self._propia(id_accion, usuario)
        self._validar_estado(accion, datos.estado)
        cambios: dict = {"estado": datos.estado}
        if datos.estado == "Completada" and accion.estado != "Completada":
            cambios["temperatura_al_completar"] = self._zonas.temperatura_de(accion.id_barrio)
        return self._repository.update(accion.model_copy(update=cambios))

    def eliminar(self, id_accion: str, usuario: UsuarioDB) -> None:
        self._propia(id_accion, usuario)
        self._repository.delete(id_accion)

    @staticmethod
    def _validar_estado(accion: Accion, nuevo: str) -> None:
        if accion.estado == "Completada" and nuevo != "Completada":
            raise SolicitudIncorrectaError("Una acción completada no puede reabrirse.")


accion_service = AccionService()
