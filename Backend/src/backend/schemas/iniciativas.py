from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

EstadoIniciativa = Literal["Propuesta", "En curso", "Cumplida", "Cancelada"]


class IniciativaBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    titulo: str = Field(..., min_length=1, max_length=100)
    descripcion: str = Field(..., min_length=1, max_length=400)
    meta: str = Field(..., min_length=1, max_length=200)
    estado: EstadoIniciativa


class IniciativaCreate(IniciativaBase):
    """El barrio se toma del vecino que la crea."""


class IniciativaUpdate(IniciativaBase):
    """Datos para editar una iniciativa propia."""


class Iniciativa(BaseModel):
    """Iniciativa vecinal de un barrio."""

    id: str
    id_barrio: str
    id_creador: str
    titulo: str
    descripcion: str
    meta: str
    estado: EstadoIniciativa
    participantes: int
    temperatura_al_cumplir: float | None = None


class IniciativaConParticipacion(Iniciativa):
    """Iniciativa vista por un vecino concreto."""

    sumado: bool
    es_mia: bool
