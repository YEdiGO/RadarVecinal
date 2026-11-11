from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

TipoAccion = Literal[
    "Patrullaje de serenazgo",
    "Operativo con la policía",
    "Alumbrado",
    "Campaña de prevención",
    "Otro",
]
EstadoAccion = Literal["Planificada", "En ejecución", "Completada"]

MAX_FOTOS = 4
MAX_TAMANO_FOTO = 7_000_000  # caracteres del base64 (≈ 5 MB de imagen)
PREFIJOS_FOTO = (
    "data:image/jpeg;base64,",
    "data:image/png;base64,",
    "data:image/webp;base64,",
)


class AccionBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    id_barrio: str = Field(..., min_length=1, examples=["b1"])
    tipo: TipoAccion
    titulo: str = Field(..., min_length=1, max_length=100)
    descripcion: str = Field(..., min_length=1, max_length=400)
    fecha: date
    estado: EstadoAccion
    fotos: list[str] = Field(default_factory=list, max_length=MAX_FOTOS)
    # Reporte ciudadano al que responde esta acción (opcional): cierra el círculo vecino↔Municipalidad.
    id_reporte: str | None = Field(default=None, max_length=80)

    @field_validator("fotos")
    @classmethod
    def fotos_validas(cls, fotos: list[str]) -> list[str]:
        for foto in fotos:
            if not foto.startswith(PREFIJOS_FOTO) or len(foto) > MAX_TAMANO_FOTO:
                raise ValueError("Las fotos deben ser JPG, PNG o WebP de máximo 5 MB.")
        return fotos


class AccionCreate(AccionBase):
    """Datos para registrar una acción municipal."""


class AccionUpdate(AccionBase):
    """Datos para editar una acción propia."""


class CambioEstadoAccion(BaseModel):
    estado: EstadoAccion


class Accion(BaseModel):
    """Acción de respuesta de la Municipalidad en un barrio."""

    id: str
    id_barrio: str
    id_autoridad: str
    institucion: str
    tipo: TipoAccion
    titulo: str
    descripcion: str
    fecha: datetime
    estado: EstadoAccion
    fotos: list[str]
    id_reporte: str | None = None
    fecha_registro: datetime | None = None
    temperatura_al_completar: float | None = None
