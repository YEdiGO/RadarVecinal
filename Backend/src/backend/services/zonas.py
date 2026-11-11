from collections import Counter
from datetime import UTC, datetime

from backend.repositories.barrios import BarrioRepository, barrio_repository
from backend.schemas.reportes import Reporte
from backend.schemas.zonas import TipoFrecuente, ZonaResumen
from backend.services.reportes import ReporteService, reporte_service
from backend.services.temperatura import nivel_temperatura, temperatura_zona


class ZonaService:
    """Calcula el resumen (temperatura, color, tipos frecuentes) de cada barrio."""

    def __init__(
        self,
        reportes: ReporteService | None = None,
        barrios: BarrioRepository | None = None,
    ) -> None:
        self._reportes = reportes or reporte_service
        self._barrios = barrios or barrio_repository

    def resumen(self, tipo: str | None = None, dias: int | None = None) -> list[ZonaResumen]:
        ahora = datetime.now(UTC)
        reportes = self._reportes.listar(tipo, dias)
        zonas = []
        for barrio in self._barrios.list():
            del_barrio: list[Reporte] = [r for r in reportes if r.id_barrio == barrio.id]
            temperatura = temperatura_zona(del_barrio, ahora)
            frecuentes = Counter(r.tipo for r in del_barrio).most_common(3)
            zonas.append(
                ZonaResumen(
                    id=barrio.id,
                    nombre=barrio.nombre,
                    poligono=barrio.poligono,
                    temperatura=temperatura,
                    nivel=nivel_temperatura(temperatura),
                    cantidad=len(del_barrio),
                    tipos_frecuentes=[TipoFrecuente(tipo=t, cantidad=c) for t, c in frecuentes],
                    ultima_actualizacion=max((r.fecha for r in del_barrio), default=None),
                )
            )
        return zonas

    def temperatura_de(self, id_barrio: str) -> float | None:
        """Temperatura actual de un barrio (se guarda al completar acciones/iniciativas)."""
        zona = next((z for z in self.resumen() if z.id == id_barrio), None)
        return zona.temperatura if zona else None


zona_service = ZonaService()
