from backend.schemas.iniciativas import Iniciativa


class IniciativaRepository:
    """Iniciativas vecinales en memoria y sus participantes."""

    def __init__(self) -> None:
        self._iniciativas: dict[str, Iniciativa] = {}
        # id_iniciativa -> {id_usuario que se sumaron}
        self._participantes: dict[str, set[str]] = {}

    def list(self) -> list[Iniciativa]:
        return list(self._iniciativas.values())

    def get(self, id_iniciativa: str) -> Iniciativa | None:
        return self._iniciativas.get(id_iniciativa)

    def add(self, iniciativa: Iniciativa) -> Iniciativa:
        self._iniciativas[iniciativa.id] = iniciativa
        return iniciativa

    def update(self, iniciativa: Iniciativa) -> Iniciativa:
        self._iniciativas[iniciativa.id] = iniciativa
        return iniciativa

    def delete(self, id_iniciativa: str) -> bool:
        self._participantes.pop(id_iniciativa, None)
        return self._iniciativas.pop(id_iniciativa, None) is not None

    def participantes_de(self, id_iniciativa: str) -> set[str]:
        return self._participantes.setdefault(id_iniciativa, set())


iniciativa_repository = IniciativaRepository()
