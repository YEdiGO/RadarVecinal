"""Rutas SOLO para la exposición: provocan a propósito cada código de error HTTP.

Sirven para mostrar cómo `raise` + los manejadores de main.py devuelven JSON con el código
correcto. Se pueden borrar sin afectar al resto del sistema.
"""

from fastapi import APIRouter

from backend.services.exceptions import (
    AccesoDenegadoError,
    ConflictoError,
    NoAutenticadoError,
    NoEncontradoError,
    SolicitudIncorrectaError,
)

router = APIRouter(prefix="/demo-errores", tags=["demo errores"])


@router.get("/400", summary="Provoca un 400 Bad Request")
def error_400() -> None:
    raise SolicitudIncorrectaError("Ejemplo de 400: la solicitud rompe una regla de negocio.")


@router.get("/401", summary="Provoca un 401 Unauthorized")
def error_401() -> None:
    raise NoAutenticadoError("Ejemplo de 401: debes iniciar sesión.")


@router.get("/403", summary="Provoca un 403 Forbidden")
def error_403() -> None:
    raise AccesoDenegadoError("Ejemplo de 403: no tienes permiso para esta acción.")


@router.get("/404", summary="Provoca un 404 Not Found")
def error_404() -> None:
    raise NoEncontradoError("un recurso de ejemplo", "123")


@router.get("/409", summary="Provoca un 409 Conflict")
def error_409() -> None:
    raise ConflictoError("Ejemplo de 409: el recurso ya existe.")


@router.get("/500", summary="Provoca un 500 Internal Server Error")
def error_500() -> None:
    # Una Exception que NO es de negocio: representa un fallo inesperado del servidor.
    raise RuntimeError("Ejemplo de 500: fallo inesperado en el servidor.")
