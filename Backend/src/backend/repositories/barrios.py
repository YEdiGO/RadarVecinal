from backend.schemas.barrios import Barrio

# Polígonos ilustrativos [latitud, longitud]; no son límites oficiales.
# Los barrios forman una cuadrícula continua para que el mapa de calor cubra toda la ciudad.
BARRIOS = [
    Barrio(
        id="b1",
        nombre="San Carlos",
        poligono=[(-12.043, -75.213), (-12.045, -75.196), (-12.058, -75.196), (-12.055, -75.214)],
    ),
    Barrio(
        id="b2",
        nombre="Azapampa",
        poligono=[(-12.058, -75.232), (-12.055, -75.214), (-12.072, -75.213), (-12.076, -75.231)],
    ),
    Barrio(
        id="b3",
        nombre="Ocopilla",
        poligono=[(-12.058, -75.196), (-12.060, -75.178), (-12.077, -75.177), (-12.075, -75.195)],
    ),
    Barrio(
        id="b4",
        nombre="Pío Pata",
        poligono=[(-12.047, -75.230), (-12.043, -75.213), (-12.055, -75.214), (-12.058, -75.232)],
    ),
    Barrio(
        id="b5",
        nombre="Cerrito de la Libertad",
        poligono=[(-12.055, -75.214), (-12.058, -75.196), (-12.075, -75.195), (-12.072, -75.213)],
    ),
    Barrio(
        id="b6",
        nombre="El Tambo",
        poligono=[(-12.045, -75.196), (-12.049, -75.179), (-12.060, -75.178), (-12.058, -75.196)],
    ),
    Barrio(
        id="b7",
        nombre="Chilca",
        poligono=[(-12.076, -75.231), (-12.072, -75.213), (-12.088, -75.212), (-12.091, -75.230)],
    ),
    Barrio(
        id="b8",
        nombre="San Pedro",
        poligono=[(-12.075, -75.195), (-12.077, -75.177), (-12.093, -75.176), (-12.090, -75.194)],
    ),
    Barrio(
        id="b9",
        nombre="La Rivera",
        poligono=[(-12.072, -75.213), (-12.075, -75.195), (-12.090, -75.194), (-12.088, -75.212)],
    ),
    Barrio(
        id="b10",
        nombre="Cajas Grande",
        poligono=[(-12.091, -75.230), (-12.088, -75.212), (-12.105, -75.211), (-12.108, -75.229)],
    ),
    Barrio(
        id="b11",
        nombre="San Antonio",
        poligono=[(-12.088, -75.212), (-12.090, -75.194), (-12.107, -75.193), (-12.105, -75.211)],
    ),
    Barrio(
        id="b12",
        nombre="Incho",
        poligono=[(-12.090, -75.194), (-12.093, -75.176), (-12.110, -75.175), (-12.107, -75.193)],
    ),
]


class BarrioRepository:
    """Catálogo de barrios (solo lectura)."""

    def __init__(self) -> None:
        self._barrios = {b.id: b for b in BARRIOS}

    def list(self) -> list[Barrio]:
        return list(self._barrios.values())

    def get(self, id_barrio: str) -> Barrio | None:
        return self._barrios.get(id_barrio)


barrio_repository = BarrioRepository()
