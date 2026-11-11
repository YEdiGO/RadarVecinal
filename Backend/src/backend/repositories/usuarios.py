from backend.schemas.usuarios import UsuarioDB


class UsuarioRepository:
    """Almacenamiento de usuarios en memoria, indexado por id."""

    def __init__(self) -> None:
        self._usuarios: dict[str, UsuarioDB] = {}

    def list(self) -> list[UsuarioDB]:
        return list(self._usuarios.values())

    def get(self, id_usuario: str) -> UsuarioDB | None:
        return self._usuarios.get(id_usuario)

    def get_by_correo(self, correo: str) -> UsuarioDB | None:
        return next((u for u in self._usuarios.values() if u.correo == correo), None)

    def add(self, usuario: UsuarioDB) -> UsuarioDB:
        self._usuarios[usuario.id] = usuario
        return usuario

    def update(self, usuario: UsuarioDB) -> UsuarioDB:
        self._usuarios[usuario.id] = usuario
        return usuario

    def delete(self, id_usuario: str) -> bool:
        return self._usuarios.pop(id_usuario, None) is not None


usuario_repository = UsuarioRepository()
