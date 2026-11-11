from backend.schemas.paneles import Alerta


class AlertaRepository:
    """Una alerta como máximo por barrio, en memoria."""

    def __init__(self) -> None:
        self._alertas: dict[str, Alerta] = {}

    def list(self) -> list[Alerta]:
        return list(self._alertas.values())

    def get(self, id_barrio: str) -> Alerta | None:
        return self._alertas.get(id_barrio)

    def set(self, alerta: Alerta) -> Alerta:
        self._alertas[alerta.id_barrio] = alerta
        return alerta


alerta_repository = AlertaRepository()
