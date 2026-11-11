from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from backend.schemas.reportes import TipoIncidente

NivelTemperatura = Literal["verde", "amarillo", "naranja", "rojo"]


class TipoFrecuente(BaseModel):
    tipo: TipoIncidente
    cantidad: int


class ZonaResumen(BaseModel):
    """Resumen de un barrio para el mapa de calor."""

    id: str
    nombre: str
    poligono: list[tuple[float, float]]
    temperatura: float
    nivel: NivelTemperatura
    cantidad: int
    tipos_frecuentes: list[TipoFrecuente]
    ultima_actualizacion: datetime | None


class PuntoCaliente(BaseModel):
    """Punto geográfico con más actividad (para las estadísticas municipales)."""

    lat: float
    lng: float
    temperatura: float
    cantidad: int
    id_barrio: str
