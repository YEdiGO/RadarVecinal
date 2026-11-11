from typing import Annotated

from fastapi import APIRouter, Depends, status

from backend.apis.dependencias import IdPath, MunicipalidadDep, UsuarioDep
from backend.schemas.acciones import (
    Accion,
    AccionCreate,
    AccionUpdate,
    CambioEstadoAccion,
)
from backend.services.acciones import AccionService, accion_service

router = APIRouter(prefix="/acciones", tags=["acciones municipales"])


def get_accion_service() -> AccionService:
    return accion_service


ServiceDep = Annotated[AccionService, Depends(get_accion_service)]


@router.get("", response_model=list[Accion], summary="Listar acciones municipales")
def listar_acciones(_: UsuarioDep, service: ServiceDep, id_barrio: str | None = None) -> list[Accion]:
    return service.listar(id_barrio)


@router.get("/{id_accion}", response_model=Accion, summary="Obtener una acción")
def obtener_accion(id_accion: IdPath, _: UsuarioDep, service: ServiceDep) -> Accion:
    return service.obtener(id_accion)


@router.post(
    "",
    response_model=Accion,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar una acción (Municipalidad)",
)
def crear_accion(datos: AccionCreate, muni: MunicipalidadDep, service: ServiceDep) -> Accion:
    return service.crear(datos, muni)


@router.put("/{id_accion}", response_model=Accion, summary="Editar mi acción (Municipalidad)")
def actualizar_accion(
    id_accion: IdPath, datos: AccionUpdate, muni: MunicipalidadDep, service: ServiceDep
) -> Accion:
    return service.actualizar(id_accion, datos, muni)


@router.patch(
    "/{id_accion}/estado",
    response_model=Accion,
    summary="Cambiar el estado de mi acción (Municipalidad)",
)
def cambiar_estado_accion(
    id_accion: IdPath, datos: CambioEstadoAccion, muni: MunicipalidadDep, service: ServiceDep
) -> Accion:
    return service.cambiar_estado(id_accion, datos, muni)


@router.delete(
    "/{id_accion}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar mi acción (Municipalidad)",
)
def eliminar_accion(id_accion: IdPath, muni: MunicipalidadDep, service: ServiceDep) -> None:
    service.eliminar(id_accion, muni)
