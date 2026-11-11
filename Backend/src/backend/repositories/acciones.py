from backend.schemas.acciones import Accion


class AccionRepository:
    """Acciones municipales en memoria y registro de noticias leídas por vecino."""

    def __init__(self) -> None:
        self._acciones: dict[str, Accion] = {}
        # id_usuario -> {id_accion leídas}
        self._leidas: dict[str, set[str]] = {}

    def list(self) -> list[Accion]:
        return list(self._acciones.values())

    def get(self, id_accion: str) -> Accion | None:
        return self._acciones.get(id_accion)

    def add(self, accion: Accion) -> Accion:
        self._acciones[accion.id] = accion
        return accion

    def update(self, accion: Accion) -> Accion:
        self._acciones[accion.id] = accion
        return accion

    def delete(self, id_accion: str) -> bool:
        return self._acciones.pop(id_accion, None) is not None

    def leidas_de(self, id_usuario: str) -> set[str]:
        return self._leidas.setdefault(id_usuario, set())


accion_repository = AccionRepository()
