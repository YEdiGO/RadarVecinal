from typing import Annotated

from fastapi import APIRouter, Depends, status

from backend.apis.dependencias import MunicipalidadDep, UsuarioDep, VecinoDep
from backend.schemas.paneles import (
    Alerta,
    MiBarrio,
    NoticiasLeidas,
    NoticiasNuevas,
    PanelMunicipal,
)
from backend.services.alertas import AlertaService, alerta_service
from backend.services.paneles import PanelService, panel_service

router = APIRouter(tags=["paneles y alertas"])


def get_panel_service() -> PanelService:
    return panel_service


def get_alerta_service() -> AlertaService:
    return alerta_service


PanelDep = Annotated[PanelService, Depends(get_panel_service)]
AlertaDep = Annotated[AlertaService, Depends(get_alerta_service)]


@router.get("/municipal/panel", response_model=PanelMunicipal, summary="Panel de la Municipalidad")
def panel_municipal(muni: MunicipalidadDep, service: PanelDep) -> PanelMunicipal:
    return service.panel_municipal(muni)


@router.get("/mi-barrio", response_model=MiBarrio, summary="Mi barrio: temperatura, reportes y noticias")
def mi_barrio(vecino: VecinoDep, service: PanelDep) -> MiBarrio:
    return service.mi_barrio(vecino)


@router.get(
    "/mi-barrio/noticias-nuevas", response_model=NoticiasNuevas, summary="¿Hay noticias sin leer?"
)
def noticias_nuevas(vecino: VecinoDep, service: PanelDep) -> NoticiasNuevas:
    return NoticiasNuevas(nuevas=service.hay_noticias_nuevas(vecino))


@router.post(
    "/mi-barrio/noticias-leidas",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Marcar noticias como leídas",
)
def marcar_noticias_leidas(datos: NoticiasLeidas, vecino: VecinoDep, service: PanelDep) -> None:
    service.marcar_leidas(vecino, datos.ids)


@router.get("/alertas", response_model=list[Alerta], summary="Alertas de barrio activas")
def alertas_activas(_: UsuarioDep, service: AlertaDep) -> list[Alerta]:
    return service.activas()


@router.post(
    "/alertas",
    response_model=Alerta,
    status_code=status.HTTP_201_CREATED,
    summary="Activar alerta de 30 minutos en mi barrio (Vecino)",
)
def activar_alerta(vecino: VecinoDep, service: AlertaDep) -> Alerta:
    return service.activar(vecino)
