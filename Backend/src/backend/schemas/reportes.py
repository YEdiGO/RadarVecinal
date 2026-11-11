import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.schemas.acciones import Accion

TipoIncidente = Literal[
    "asalto_robo",
    "pandillaje",
    "alcohol_drogas",
    "falta_alumbrado",
    "actividad_sospechosa",
    "otro",
]
EstadoReporte = Literal["activo", "confirmado", "falso", "archivado"]


class ReporteBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    lat: float = Field(..., ge=-90, le=90, allow_inf_nan=False, examples=[-12.059])
    lng: float = Field(..., ge=-180, le=180, allow_inf_nan=False, examples=[-75.2])
    tipo: TipoIncidente
    descripcion: str = Field(..., min_length=1, max_length=280)

    @field_validator("descripcion")
    @classmethod
    def sin_caracteres_de_control(cls, valor: str) -> str:
        # Mismo filtro que el prototipo: no se aceptan caracteres de control.
        if re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", valor):
            raise ValueError("La descripción contiene caracteres no válidos.")
        return valor


class ReporteCreate(ReporteBase):
    """Datos para crear un reporte (el barrio y la gravedad los calcula el servidor)."""


class ReporteUpdate(ReporteBase):
    """Datos para editar un reporte propio."""


class Voto(BaseModel):
    voto: Literal["confirmo", "incorrecto"]


class ModeracionReporte(BaseModel):
    """La Municipalidad puede marcar un reporte como falso o archivarlo."""

    estado: Literal["falso", "archivado"]


class ReportePublico(BaseModel):
    """Reporte sin datos del autor: es lo que ve cualquier usuario (anónimo)."""

    id: str
    lat: float
    lng: float
    id_barrio: str
    tipo: TipoIncidente
    gravedad: int
    descripcion: str
    fecha: datetime
    estado: EstadoReporte
    confirmaciones: int
    # Cuántos vecinos lo denunciaron para revisión (0 si nadie lo ha hecho).
    denuncias: int = 0


class Reporte(ReportePublico):
    """Reporte almacenado: incluye quién lo creó."""

    id_usuario: str


class ReporteDetalle(ReportePublico):
    """Detalle de un reporte según el usuario que lo mira."""

    propio: bool
    mi_voto: Literal["confirmo", "incorrecto"] | None
    denunciado: bool
    incorrectos: int
    # Respuestas oficiales de la Municipalidad a este reporte.
    acciones: list[Accion] = Field(default_factory=list)
