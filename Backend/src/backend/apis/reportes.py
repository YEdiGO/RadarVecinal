from typing import Annotated

from fastapi import APIRouter, Depends, status

from backend.apis.dependencias import (
    DiasQuery,
    IdPath,
    MunicipalidadDep,
    TipoQuery,
    UsuarioDep,
    VecinoDep,
)
from backend.schemas.reportes import (
    ModeracionReporte,
    Reporte,
    ReporteCreate,
    ReporteDetalle,
    ReportePublico,
    ReporteUpdate,
    Voto,
)
from backend.services.reportes import ReporteService, reporte_service

router = APIRouter(prefix="/reportes", tags=["reportes"])


def get_reporte_service() -> ReporteService:
    return reporte_service


ServiceDep = Annotated[ReporteService, Depends(get_reporte_service)]


# Los reportes de otras personas salen SIEMPRE sin el autor (response_model=ReportePublico).
@router.get("", response_model=list[ReportePublico], summary="Listar reportes (anónimos)")
def listar_reportes(
    _: UsuarioDep, service: ServiceDep, tipo: TipoQuery = None, dias: DiasQuery = None
) -> list[ReportePublico]:
    return service.listar(tipo, dias)


# OJO: "/mios" va ANTES de "/{id_reporte}", si no FastAPI creería que "mios" es un id.
@router.get("/mios", response_model=list[Reporte], summary="Mis reportes (Vecino)")
def mis_reportes(vecino: VecinoDep, service: ServiceDep) -> list[Reporte]:
    return service.mios(vecino)


@router.get("/{id_reporte}", response_model=ReporteDetalle, summary="Detalle de un reporte")
def detalle_reporte(id_reporte: IdPath, usuario: UsuarioDep, service: ServiceDep) -> ReporteDetalle:
    return service.detalle(id_reporte, usuario)


@router.post(
    "",
    response_model=Reporte,
    status_code=status.HTTP_201_CREATED,
    summary="Crear un reporte (Vecino)",
)
def crear_reporte(datos: ReporteCreate, vecino: VecinoDep, service: ServiceDep) -> Reporte:
    return service.crear(datos, vecino)


@router.put("/{id_reporte}", response_model=Reporte, summary="Editar mi reporte (Vecino)")
def actualizar_reporte(
    id_reporte: IdPath, datos: ReporteUpdate, vecino: VecinoDep, service: ServiceDep
) -> Reporte:
    return service.actualizar(id_reporte, datos, vecino)


@router.delete(
    "/{id_reporte}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar mi reporte (Vecino)",
)
def eliminar_reporte(id_reporte: IdPath, vecino: VecinoDep, service: ServiceDep) -> None:
    service.eliminar(id_reporte, vecino)


@router.post(
    "/{id_reporte}/votos",
    response_model=ReportePublico,
    status_code=status.HTTP_201_CREATED,
    summary="Confirmar o marcar como incorrecto un reporte (Vecino)",
)
def votar_reporte(
    id_reporte: IdPath, datos: Voto, vecino: VecinoDep, service: ServiceDep
) -> ReportePublico:
    return service.votar(id_reporte, datos, vecino)


@router.post(
    "/{id_reporte}/denuncias",
    status_code=status.HTTP_201_CREATED,
    summary="Denunciar un reporte para revisión (Vecino)",
)
def denunciar_reporte(id_reporte: IdPath, vecino: VecinoDep, service: ServiceDep) -> dict[str, str]:
    service.denunciar(id_reporte, vecino)
    return {"detail": "Denuncia registrada para revisión."}


@router.patch(
    "/{id_reporte}/estado",
    response_model=ReportePublico,
    summary="Moderar: marcar como falso o archivar (Municipalidad)",
)
def moderar_reporte(
    id_reporte: IdPath, datos: ModeracionReporte, _: MunicipalidadDep, service: ServiceDep
) -> ReportePublico:
    return service.moderar(id_reporte, datos)
