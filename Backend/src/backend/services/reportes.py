from datetime import UTC, datetime, timedelta
from uuid import uuid4

from backend.repositories.acciones import accion_repository
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

# Ventana para considerar que dos envíos del mismo vecino son el mismo reporte repetido.
MINUTOS_DUPLICADO = 10


def _normalizar(texto: str) -> str:
    """Minúsculas y espacios simples: 'Robo  en la esquina' == 'robo en la esquina'."""
    return " ".join(texto.lower().split())


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
        resultado = []
        for r in self._repository.list():
            if r.estado == "archivado":
                continue
            if desde is not None and r.fecha < desde:
                continue
            if tipo not in (None, "todos") and r.tipo != tipo:
                continue
            denuncias = len(self._repository.denuncias_de(r.id))
            resultado.append(r.model_copy(update={"denuncias": denuncias}) if denuncias else r)
        return sorted(resultado, key=lambda r: r.fecha, reverse=True)

    def mios(self, usuario: UsuarioDB) -> list[Reporte]:
        propios = [r for r in self._repository.list() if r.id_usuario == usuario.id]
        return sorted(propios, key=lambda r: r.fecha, reverse=True)

    def detalle(self, id_reporte: str, usuario: UsuarioDB) -> ReporteDetalle:
        reporte = self._buscar(id_reporte)
        votos = self._repository.votos_de(id_reporte)
        denuncias = self._repository.denuncias_de(id_reporte)
        acciones = sorted(
            (a for a in accion_repository.list() if a.id_reporte == id_reporte),
            key=lambda a: a.fecha,
        )
        return ReporteDetalle(
            **reporte.model_dump(),
            propio=reporte.id_usuario == usuario.id,
            mi_voto=votos.get(usuario.id),
            denunciado=usuario.id in denuncias,
            incorrectos=sum(1 for v in votos.values() if v == "incorrecto"),
            denuncias=len(denuncias),
            acciones=acciones,
        )

    # --- CRUD ---
    def crear(self, datos: ReporteCreate, usuario: UsuarioDB) -> Reporte:
        self._revisar_duplicado(datos, usuario)
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

    def _revisar_duplicado(self, datos: ReporteCreate, usuario: UsuarioDB) -> None:
        """Evita guardar dos veces el mismo reporte (doble clic o reenvío accidental)."""
        ahora = datetime.now(UTC)
        limite = ahora - timedelta(minutes=MINUTOS_DUPLICADO)
        for r in self._repository.list():
            if r.id_usuario != usuario.id or r.estado == "archivado":
                continue
            if r.tipo != datos.tipo or r.fecha < limite:
                continue
            if _normalizar(r.descripcion) == _normalizar(datos.descripcion):
                raise ConflictoError(
                    "Ya registraste este mismo reporte hace unos minutos. "
                    "Espera un momento antes de volver a enviarlo."
                )

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
        if reporte.id_usuario == usuario.id:
            raise AccesoDenegadoError("No puedes valorar tu propio reporte.")
        if reporte.estado in ("falso", "archivado"):
            raise SolicitudIncorrectaError("Este reporte ya fue descartado por la Municipalidad.")
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
