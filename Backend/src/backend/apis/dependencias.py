"""Dependencias compartidas por los routers (quién es el usuario y qué rol tiene).

Sesión simplificada: el frontend envía el encabezado `X-Usuario-Id` con el id que recibió
en el login. Más adelante se puede cambiar por un token JWT sin tocar los servicios.
"""

from typing import Annotated, Literal

from fastapi import Depends, Header, Path, Query

from backend.schemas.reportes import TipoIncidente
from backend.schemas.usuarios import UsuarioDB
from backend.services.exceptions import AccesoDenegadoError
from backend.services.usuarios import UsuarioService, usuario_service

# Los ids solo pueden tener letras, números, guion y guion bajo (si no, FastAPI responde 422).
IdPath = Annotated[str, Path(pattern=r"^[a-zA-Z0-9_-]{1,80}$", description="Identificador.")]


# Filtros del mapa: tipo de incidente (o "todos") y antigüedad máxima en días.
TipoQuery = Annotated[TipoIncidente | Literal["todos"] | None, Query()]
DiasQuery = Annotated[int | None, Query(ge=1, le=365)]


def get_usuario_service() -> UsuarioService:
    return usuario_service


def get_usuario_sin_verificar(
    service: Annotated[UsuarioService, Depends(get_usuario_service)],
    x_usuario_id: Annotated[str | None, Header()] = None,
) -> UsuarioDB:
    """Identifica al usuario (401 si no hay sesión). No mira su estado de verificación."""
    return service.usuario_actual(x_usuario_id)


def get_usuario(
    usuario: Annotated[UsuarioDB, Depends(get_usuario_sin_verificar)],
) -> UsuarioDB:
    """Usuario con cuenta verificada (403 si está pendiente o rechazada)."""
    if usuario.estado == "Pendiente":
        raise AccesoDenegadoError("Tu cuenta está pendiente de verificación por la Municipalidad.")
    if usuario.estado == "Rechazado":
        raise AccesoDenegadoError("Tu solicitud de acceso fue rechazada.")
    return usuario


def get_vecino(usuario: Annotated[UsuarioDB, Depends(get_usuario)]) -> UsuarioDB:
    if usuario.rol != "vecino":
        raise AccesoDenegadoError("Solo los vecinos pueden realizar esta acción.")
    return usuario


def get_municipalidad(usuario: Annotated[UsuarioDB, Depends(get_usuario)]) -> UsuarioDB:
    if usuario.rol != "municipalidad":
        raise AccesoDenegadoError("Solo la Municipalidad puede realizar esta acción.")
    return usuario


# Atajos para usar en los endpoints:  def endpoint(vecino: VecinoDep): ...
SesionDep = Annotated[UsuarioDB, Depends(get_usuario_sin_verificar)]
UsuarioDep = Annotated[UsuarioDB, Depends(get_usuario)]
VecinoDep = Annotated[UsuarioDB, Depends(get_vecino)]
MunicipalidadDep = Annotated[UsuarioDB, Depends(get_municipalidad)]
