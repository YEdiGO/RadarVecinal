import hashlib
from datetime import UTC, datetime
from uuid import uuid4

from backend.repositories.barrios import BarrioRepository, barrio_repository
from backend.repositories.usuarios import UsuarioRepository, usuario_repository
from backend.schemas.usuarios import (
    Login,
    UsuarioDB,
    UsuarioRegistro,
    UsuarioUpdate,
    Verificacion,
)
from backend.services.exceptions import (
    AccesoDenegadoError,
    ConflictoError,
    NoAutenticadoError,
    NoEncontradoError,
    SolicitudIncorrectaError,
)


def hashear(clave: str) -> str:
    """Hash simple para no guardar la contraseña en texto plano.

    OJO: para producción se usa bcrypt/argon2; sha256 alcanza para la demo en memoria.
    """
    return hashlib.sha256(clave.encode()).hexdigest()


class UsuarioService:
    """Reglas de negocio de cuentas: registro, login, verificación y CRUD."""

    def __init__(
        self,
        repository: UsuarioRepository | None = None,
        barrios: BarrioRepository | None = None,
    ) -> None:
        self._repository = repository or usuario_repository
        self._barrios = barrios or barrio_repository

    # --- sesión ---
    def login(self, datos: Login) -> UsuarioDB:
        usuario = self._repository.get_by_correo(datos.correo.lower())
        if usuario is None or usuario.clave_hash != hashear(datos.clave):
            raise NoAutenticadoError("Correo o contraseña incorrectos. Revisa tus credenciales.")
        return usuario

    def usuario_actual(self, id_usuario: str | None) -> UsuarioDB:
        """Identifica al usuario por el encabezado X-Usuario-Id (sesión simplificada)."""
        if not id_usuario:
            raise NoAutenticadoError("Debes iniciar sesión para usar esta función.")
        usuario = self._repository.get(id_usuario)
        if usuario is None:
            raise NoAutenticadoError("Tu sesión ya no es válida. Vuelve a iniciar sesión.")
        return usuario

    # --- CRUD ---
    def registrar(self, datos: UsuarioRegistro) -> UsuarioDB:
        if self._barrios.get(datos.id_barrio) is None:
            raise SolicitudIncorrectaError("El barrio seleccionado no existe.")
        correo = datos.correo.lower()
        if self._repository.get_by_correo(correo) is not None:
            raise ConflictoError(f"Ya existe una cuenta con el correo '{correo}'.")
        usuario = UsuarioDB(
            id=f"v_{uuid4().hex[:8]}",
            nombre=datos.nombre,
            correo=correo,
            rol="vecino",
            id_barrio=datos.id_barrio,
            estado="Pendiente",  # la Municipalidad debe aprobarlo
            fecha_registro=datetime.now(UTC),
            clave_hash=hashear(datos.clave),
        )
        return self._repository.add(usuario)

    def listar(self, estado: str | None = None) -> list[UsuarioDB]:
        usuarios = self._repository.list()
        if estado:
            usuarios = [u for u in usuarios if u.estado == estado]
        return usuarios

    def obtener(self, id_usuario: str) -> UsuarioDB:
        usuario = self._repository.get(id_usuario)
        if usuario is None:
            raise NoEncontradoError("un usuario", id_usuario)
        return usuario

    def actualizar(self, id_usuario: str, datos: UsuarioUpdate, actor: UsuarioDB) -> UsuarioDB:
        usuario = self.obtener(id_usuario)
        if actor.id != usuario.id and actor.rol != "municipalidad":
            raise AccesoDenegadoError("Solo puedes modificar tu propia cuenta.")
        if usuario.rol == "vecino" and self._barrios.get(datos.id_barrio) is None:
            raise SolicitudIncorrectaError("El barrio seleccionado no existe.")
        cambios = {"nombre": datos.nombre}
        if usuario.rol == "vecino":
            cambios["id_barrio"] = datos.id_barrio
        return self._repository.update(usuario.model_copy(update=cambios))

    def eliminar(self, id_usuario: str) -> None:
        usuario = self.obtener(id_usuario)
        if usuario.rol == "municipalidad":
            raise SolicitudIncorrectaError("No se puede eliminar una cuenta de la Municipalidad.")
        self._repository.delete(id_usuario)

    # --- verificación (la hace la Municipalidad) ---
    def verificar(self, id_usuario: str, datos: Verificacion) -> UsuarioDB:
        usuario = self.obtener(id_usuario)
        if usuario.rol != "vecino" or usuario.estado != "Pendiente":
            raise SolicitudIncorrectaError("La solicitud ya fue revisada.")
        nuevo_estado = "Verificado" if datos.decision == "aprobar" else "Rechazado"
        return self._repository.update(usuario.model_copy(update={"estado": nuevo_estado}))


usuario_service = UsuarioService()
