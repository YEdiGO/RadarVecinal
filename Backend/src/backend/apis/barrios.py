from typing import Annotated

from fastapi import APIRouter, Depends

from backend.apis.dependencias import DiasQuery, IdPath, TipoQuery, UsuarioDep
from backend.repositories.barrios import BarrioRepository, barrio_repository
from backend.schemas.barrios import Barrio
from backend.schemas.zonas import ZonaResumen
from backend.services.exceptions import NoEncontradoError
from backend.services.zonas import ZonaService, zona_service

router = APIRouter(tags=["barrios"])


def get_barrio_repository() -> BarrioRepository:
    return barrio_repository


def get_zona_service() -> ZonaService:
    return zona_service


@router.get("/barrios", response_model=list[Barrio], summary="Listar barrios (público)")
def listar_barrios(repo: Annotated[BarrioRepository, Depends(get_barrio_repository)]) -> list[Barrio]:
    # Es público porque la pantalla de registro necesita elegir barrio antes de tener cuenta.
    return repo.list()


@router.get("/barrios/{id_barrio}", response_model=Barrio, summary="Obtener un barrio")
def obtener_barrio(
    id_barrio: IdPath, repo: Annotated[BarrioRepository, Depends(get_barrio_repository)]
) -> Barrio:
    barrio = repo.get(id_barrio)
    if barrio is None:
        raise NoEncontradoError("un barrio", id_barrio)
    return barrio


@router.get("/zonas", response_model=list[ZonaResumen], summary="Mapa de calor: resumen por barrio")
def listar_zonas(
    _: UsuarioDep,
    service: Annotated[ZonaService, Depends(get_zona_service)],
    tipo: TipoQuery = None,
    dias: DiasQuery = None,
) -> list[ZonaResumen]:
    return service.resumen(tipo, dias)
