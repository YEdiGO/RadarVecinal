from datetime import UTC, datetime, timedelta

from backend.repositories.acciones import AccionRepository, accion_repository
from backend.schemas.paneles import MiBarrio, PanelMunicipal
from backend.schemas.reportes import Reporte
from backend.schemas.usuarios import UsuarioDB
from backend.schemas.zonas import PuntoCaliente, ZonaResumen
from backend.services.acciones import AccionService, accion_service
from backend.services.exceptions import SolicitudIncorrectaError
from backend.services.reportes import ReporteService, reporte_service
from backend.services.temperatura import peso_reporte
from backend.services.usuarios import UsuarioService, usuario_service
from backend.services.zonas import ZonaService, zona_service


class PanelService:
    """Arma la información de las pantallas 'Municipalidad' y 'Mi barrio'."""

    def __init__(
        self,
        zonas: ZonaService | None = None,
        reportes: ReporteService | None = None,
        acciones: AccionService | None = None,
        usuarios: UsuarioService | None = None,
        acciones_repo: AccionRepository | None = None,
    ) -> None:
        self._zonas = zonas or zona_service
        self._reportes = reportes or reporte_service
        self._acciones = acciones or accion_service
        self._usuarios = usuarios or usuario_service
        self._acciones_repo = acciones_repo or accion_repository

    # --- Municipalidad ---
    def panel_municipal(self, usuario: UsuarioDB) -> PanelMunicipal:
        zonas = self._zonas.resumen()
        acciones = self._acciones.listar()
        reportes = self._reportes.listar()
        return PanelMunicipal(
            zonas=zonas,
            criticos=self._barrios_criticos(zonas),
            acciones=acciones,
            propias=[a for a in acciones if a.id_autoridad == usuario.id],
            pendientes=self._usuarios.listar("Pendiente"),
            reportes=reportes,
            puntos=self._puntos_calientes(reportes),
        )

    def _barrios_criticos(self, zonas: list[ZonaResumen]) -> list[ZonaResumen]:
        """Barrios naranja/rojo SIN ninguna acción registrada en los últimos 15 días."""
        ahora = datetime.now(UTC)
        desde = ahora - timedelta(days=15)
        acciones = self._acciones_repo.list()

        def con_respuesta_reciente(id_barrio: str) -> bool:
            return any(
                a.id_barrio == id_barrio and desde <= (a.fecha_registro or a.fecha) <= ahora
                for a in acciones
            )

        criticos = [
            z
            for z in zonas
            if z.nivel in ("naranja", "rojo") and not con_respuesta_reciente(z.id)
        ]
        return sorted(criticos, key=lambda z: z.temperatura, reverse=True)

    def _puntos_calientes(self, reportes: list[Reporte]) -> list[PuntoCaliente]:
        """Agrupa reportes por coordenadas (3 decimales) y devuelve los 10 más calientes."""
        ahora = datetime.now(UTC)
        puntos: dict[tuple[float, float], PuntoCaliente] = {}
        for r in reportes:
            if r.estado in ("falso", "archivado"):
                continue
            clave = (round(r.lat, 3), round(r.lng, 3))
            punto = puntos.setdefault(
                clave,
                PuntoCaliente(lat=clave[0], lng=clave[1], temperatura=0, cantidad=0, id_barrio=r.id_barrio),
            )
            punto.temperatura += peso_reporte(r, ahora)
            punto.cantidad += 1
        return sorted(puntos.values(), key=lambda p: p.temperatura, reverse=True)[:10]

    # --- Vecino ---
    def mi_barrio(self, usuario: UsuarioDB) -> MiBarrio:
        if usuario.id_barrio is None:
            raise SolicitudIncorrectaError("No tienes un barrio asignado.")
        zona = next((z for z in self._zonas.resumen() if z.id == usuario.id_barrio), None)
        reportes = [r for r in self._reportes.listar(dias=7) if r.id_barrio == usuario.id_barrio]
        return MiBarrio(
            zona=zona,
            reportes=reportes,
            noticias=self._acciones.listar(usuario.id_barrio),
        )

    def hay_noticias_nuevas(self, usuario: UsuarioDB) -> bool:
        if usuario.id_barrio is None:
            return False
        leidas = self._acciones_repo.leidas_de(usuario.id)
        return any(a.id not in leidas for a in self._acciones.listar(usuario.id_barrio))

    def marcar_leidas(self, usuario: UsuarioDB, ids: list[str]) -> None:
        leidas = self._acciones_repo.leidas_de(usuario.id)
        for accion in self._acciones.listar(usuario.id_barrio):
            if accion.id in ids:
                leidas.add(accion.id)


panel_service = PanelService()
