from datetime import datetime

from pydantic import BaseModel

from backend.schemas.acciones import Accion
from backend.schemas.reportes import ReportePublico
from backend.schemas.usuarios import Usuario
from backend.schemas.zonas import PuntoCaliente, ZonaResumen


class Alerta(BaseModel):
    """Alerta de barrio: dura 30 minutos desde su inicio."""

    id: str
    id_barrio: str
    inicio: datetime
    expira: datetime


class PanelMunicipal(BaseModel):
    """Todo lo que necesita la pantalla de la Municipalidad."""

    zonas: list[ZonaResumen]
    criticos: list[ZonaResumen]
    acciones: list[Accion]
    propias: list[Accion]
    pendientes: list[Usuario]
    reportes: list[ReportePublico]
    puntos: list[PuntoCaliente]


class MiBarrio(BaseModel):
    """Todo lo que necesita la pantalla 'Mi barrio' del vecino."""

    zona: ZonaResumen | None
    reportes: list[ReportePublico]
    noticias: list[Accion]


class NoticiasNuevas(BaseModel):
    nuevas: bool


class NoticiasLeidas(BaseModel):
    ids: list[str]
