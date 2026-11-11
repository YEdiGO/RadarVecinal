from pydantic import BaseModel


class Barrio(BaseModel):
    """Barrio de Huancayo. El polígono es una lista de puntos [latitud, longitud]."""

    id: str
    nombre: str
    poligono: list[tuple[float, float]]
