from typing import Annotated

from fastapi import APIRouter, Depends, status

from backend.apis.dependencias import SesionDep, get_usuario_service
from backend.schemas.usuarios import Login, Usuario, UsuarioRegistro
from backend.services.usuarios import UsuarioService

router = APIRouter(prefix="/auth", tags=["auth"])

ServiceDep = Annotated[UsuarioService, Depends(get_usuario_service)]


@router.post("/login", response_model=Usuario, summary="Iniciar sesión")
def login(datos: Login, service: ServiceDep) -> Usuario:
    return service.login(datos)


@router.post(
    "/registro",
    response_model=Usuario,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar un vecino (queda pendiente de verificación)",
)
def registrar(datos: UsuarioRegistro, service: ServiceDep) -> Usuario:
    return service.registrar(datos)


@router.get("/yo", response_model=Usuario, summary="Datos actualizados del usuario en sesión")
def yo(usuario: SesionDep) -> Usuario:
    return usuario
