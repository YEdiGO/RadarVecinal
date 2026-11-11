from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from backend.apis.dependencias import (
    IdPath,
    MunicipalidadDep,
    UsuarioDep,
    get_usuario_service,
)
from backend.schemas.usuarios import EstadoUsuario, Usuario, UsuarioUpdate, Verificacion
from backend.services.usuarios import UsuarioService

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

ServiceDep = Annotated[UsuarioService, Depends(get_usuario_service)]


@router.get("", response_model=list[Usuario], summary="Listar usuarios (Municipalidad)")
def listar_usuarios(
    _: MunicipalidadDep, service: ServiceDep, estado: Annotated[EstadoUsuario | None, Query()] = None
) -> list[Usuario]:
    return service.listar(estado)


@router.get("/{id_usuario}", response_model=Usuario, summary="Obtener un usuario")
def obtener_usuario(id_usuario: IdPath, _: UsuarioDep, service: ServiceDep) -> Usuario:
    return service.obtener(id_usuario)


@router.put("/{id_usuario}", response_model=Usuario, summary="Actualizar un usuario")
def actualizar_usuario(
    id_usuario: IdPath, datos: UsuarioUpdate, actor: UsuarioDep, service: ServiceDep
) -> Usuario:
    return service.actualizar(id_usuario, datos, actor)


@router.delete(
    "/{id_usuario}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar un usuario (Municipalidad)",
)
def eliminar_usuario(id_usuario: IdPath, _: MunicipalidadDep, service: ServiceDep) -> None:
    service.eliminar(id_usuario)


@router.patch(
    "/{id_usuario}/verificacion",
    response_model=Usuario,
    summary="Aprobar o rechazar a un vecino pendiente (Municipalidad)",
)
def verificar_usuario(
    id_usuario: IdPath, datos: Verificacion, _: MunicipalidadDep, service: ServiceDep
) -> Usuario:
    return service.verificar(id_usuario, datos)
