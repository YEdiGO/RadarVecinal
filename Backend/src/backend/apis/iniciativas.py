from typing import Annotated

from fastapi import APIRouter, Depends, status

from backend.apis.dependencias import IdPath, UsuarioDep, VecinoDep
from backend.schemas.iniciativas import (
    Iniciativa,
    IniciativaConParticipacion,
    IniciativaCreate,
    IniciativaUpdate,
)
from backend.services.iniciativas import IniciativaService, iniciativa_service

router = APIRouter(prefix="/iniciativas", tags=["iniciativas"])


def get_iniciativa_service() -> IniciativaService:
    return iniciativa_service


ServiceDep = Annotated[IniciativaService, Depends(get_iniciativa_service)]


@router.get("", response_model=list[IniciativaConParticipacion], summary="Listar iniciativas")
def listar_iniciativas(
    usuario: UsuarioDep, service: ServiceDep, id_barrio: str | None = None
) -> list[IniciativaConParticipacion]:
    return service.listar(usuario, id_barrio)


@router.get(
    "/{id_iniciativa}", response_model=IniciativaConParticipacion, summary="Detalle de una iniciativa"
)
def obtener_iniciativa(
    id_iniciativa: IdPath, usuario: UsuarioDep, service: ServiceDep
) -> IniciativaConParticipacion:
    return service.obtener(id_iniciativa, usuario)


@router.post(
    "",
    response_model=Iniciativa,
    status_code=status.HTTP_201_CREATED,
    summary="Crear una iniciativa en mi barrio (Vecino)",
)
def crear_iniciativa(datos: IniciativaCreate, vecino: VecinoDep, service: ServiceDep) -> Iniciativa:
    return service.crear(datos, vecino)


@router.put("/{id_iniciativa}", response_model=Iniciativa, summary="Editar mi iniciativa (Vecino)")
def actualizar_iniciativa(
    id_iniciativa: IdPath, datos: IniciativaUpdate, vecino: VecinoDep, service: ServiceDep
) -> Iniciativa:
    return service.actualizar(id_iniciativa, datos, vecino)


@router.delete(
    "/{id_iniciativa}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar una iniciativa (su creador o la Municipalidad)",
)
def eliminar_iniciativa(id_iniciativa: IdPath, usuario: UsuarioDep, service: ServiceDep) -> None:
    service.eliminar(id_iniciativa, usuario)


@router.post(
    "/{id_iniciativa}/participantes",
    response_model=Iniciativa,
    status_code=status.HTTP_201_CREATED,
    summary="Sumarme a una iniciativa (Vecino)",
)
def sumarse_a_iniciativa(id_iniciativa: IdPath, vecino: VecinoDep, service: ServiceDep) -> Iniciativa:
    return service.sumarse(id_iniciativa, vecino)
