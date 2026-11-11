from backend.schemas.barrios import Barrio

# Polígonos ilustrativos [latitud, longitud]; no son límites oficiales.
BARRIOS = [
    Barrio(id="b1", nombre="San Carlos", poligono=[(-12.061, -75.204), (-12.057, -75.203), (-12.056, -75.196), (-12.062, -75.196), (-12.064, -75.200)]),
    Barrio(id="b2", nombre="Azapampa", poligono=[(-12.069, -75.209), (-12.069, -75.202), (-12.073, -75.199), (-12.077, -75.203), (-12.076, -75.210)]),
    Barrio(id="b3", nombre="Ocopilla", poligono=[(-12.065, -75.201), (-12.062, -75.195), (-12.065, -75.190), (-12.071, -75.192), (-12.072, -75.197)]),
    Barrio(id="b4", nombre="Pío Pata", poligono=[(-12.058, -75.214), (-12.053, -75.212), (-12.053, -75.206), (-12.057, -75.204), (-12.061, -75.209)]),
    Barrio(id="b5", nombre="Cerrito de la Libertad", poligono=[(-12.063, -75.208), (-12.061, -75.204), (-12.064, -75.200), (-12.067, -75.201), (-12.069, -75.205), (-12.067, -75.209)]),
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
