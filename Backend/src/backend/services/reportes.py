from datetime import UTC, datetime, timedelta
from uuid import uuid4

from backend.repositories.barrios import BarrioRepository, barrio_repository
from backend.repositories.reportes import ReporteRepository, reporte_repository
from backend.schemas.reportes import (
    ModeracionReporte,
    Reporte,
    ReporteCreate,
    ReporteDetalle,
    ReporteUpdate,
    Voto,
)
from backend.schemas.usuarios import UsuarioDB
from backend.services.exceptions import (
    AccesoDenegadoError,
    ConflictoError,
    NoEncontradoError,
    SolicitudIncorrectaError,
)
from backend.services.temperatura import GRAVEDAD, barrio_del_punto


class ReporteService:
    """Reglas de negocio de los reportes ciudadanos."""

    def __init__(
        self,
        repository: ReporteRepository | None = None,
        barrios: BarrioRepository | None = None,
    ) -> None:
        self._repository = repository or reporte_repository
        self._barrios = barrios or barrio_repository

    # --- ayudas internas ---
    def _buscar(self, id_reporte: str) -> Reporte:
        reporte = self._repository.get(id_reporte)
        if reporte is None:
            raise NoEncontradoError("un reporte", id_reporte)
        return reporte

    def _propio(self, id_reporte: str, usuario: UsuarioDB) -> Reporte:
        reporte = self._buscar(id_reporte)
        if reporte.id_usuario != usuario.id:
            raise AccesoDenegadoError("Solo puedes modificar tus propios reportes.")
        return reporte

    def _barrio_id(self, lat: float, lng: float) -> str:
        barrio = barrio_del_punto(lat, lng, self._barrios.list())
        if barrio is None:
            raise SolicitudIncorrectaError("El punto debe estar dentro de un barrio del mapa.")
        return barrio.id

    # --- consultas ---
    def listar(self, tipo: str | None = None, dias: int | None = None) -> list[Reporte]:
        """Reportes no archivados, con filtros opcionales de tipo y antigüedad."""
        desde = datetime.now(UTC) - timedelta(days=dias) if dias else None
        return [
            r
            for r in self._repository.list()
            if r.estado != "archivado"
            and (desde is None or r.fecha >= desde)
            and (tipo in (None, "todos") or r.tipo == tipo)
        ]

    def mios(self, usuario: UsuarioDB) -> list[Reporte]:
        propios = [r for r in self._repository.list() if r.id_usuario == usuario.id]
        return sorted(propios, key=lambda r: r.fecha, reverse=True)

    def detalle(self, id_reporte: str, usuario: UsuarioDB) -> ReporteDetalle:
        reporte = self._buscar(id_reporte)
        votos = self._repository.votos_de(id_reporte)
        return ReporteDetalle(
            **reporte.model_dump(),
            propio=reporte.id_usuario == usuario.id,
            mi_voto=votos.get(usuario.id),
            denunciado=usuario.id in self._repository.denuncias_de(id_reporte),
            incorrectos=sum(1 for v in votos.values() if v == "incorrecto"),
        )

    # --- CRUD ---
    def crear(self, datos: ReporteCreate, usuario: UsuarioDB) -> Reporte:
        id_barrio = self._barrio_id(datos.lat, datos.lng)
        reporte = Reporte(
            **datos.model_dump(),
            id=f"r_{uuid4().hex[:8]}",
            id_usuario=usuario.id,  # el autor sale de la sesión, nunca del cliente
            gravedad=GRAVEDAD[datos.tipo],
            id_barrio=id_barrio,
            fecha=datetime.now(UTC),
            estado="activo",
            confirmaciones=0,
        )
        return self._repository.add(reporte)

    def actualizar(self, id_reporte: str, datos: ReporteUpdate, usuario: UsuarioDB) -> Reporte:
        reporte = self._propio(id_reporte, usuario)
        id_barrio = self._barrio_id(datos.lat, datos.lng)
        actualizado = reporte.model_copy(
            update={**datos.model_dump(), "id_barrio": id_barrio, "gravedad": GRAVEDAD[datos.tipo]}
        )
        return self._repository.update(actualizado)

    def eliminar(self, id_reporte: str, usuario: UsuarioDB) -> None:
        self._propio(id_reporte, usuario)
        self._repository.delete(id_reporte)

    # --- interacción entre vecinos ---
    def votar(self, id_reporte: str, datos: Voto, usuario: UsuarioDB) -> Reporte:
        reporte = self._buscar(id_reporte)
        votos = self._repository.votos_de(id_reporte)
        if usuario.id in votos:
            raise ConflictoError("Ya registraste tu valoración de este reporte.")
        votos[usuario.id] = datos.voto
        if datos.voto == "confirmo":
            confirmaciones = reporte.confirmaciones + 1
            estado = reporte.estado
            if confirmaciones >= 3 and estado == "activo":
                estado = "confirmado"
            reporte = self._repository.update(
                reporte.model_copy(update={"confirmaciones": confirmaciones, "estado": estado})
            )
        # Una valoración negativa NO declara falso el reporte: lo revisa la Municipalidad.
        return reporte

    def denunciar(self, id_reporte: str, usuario: UsuarioDB) -> None:
        self._buscar(id_reporte)
        denuncias = self._repository.denuncias_de(id_reporte)
        if usuario.id in denuncias:
            raise ConflictoError("Ya denunciaste este reporte.")
        denuncias.add(usuario.id)

    # --- moderación (Municipalidad) ---
    def moderar(self, id_reporte: str, datos: ModeracionReporte) -> Reporte:
        reporte = self._buscar(id_reporte)
        return self._repository.update(reporte.model_copy(update={"estado": datos.estado}))


reporte_service = ReporteService()
