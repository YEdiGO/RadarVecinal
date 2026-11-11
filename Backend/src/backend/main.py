import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.apis.acciones import router as acciones_router
from backend.apis.auth import router as auth_router
from backend.apis.barrios import router as barrios_router
from backend.apis.demo_errores import router as demo_errores_router
from backend.apis.iniciativas import router as iniciativas_router
from backend.apis.paneles import router as paneles_router
from backend.apis.reportes import router as reportes_router
from backend.apis.usuarios import router as usuarios_router
from backend.services.datos_iniciales import cargar_datos_iniciales
from backend.services.exceptions import (
    AccesoDenegadoError,
    ConflictoError,
    NoAutenticadoError,
    NoEncontradoError,
    SolicitudIncorrectaError,
)

logger = logging.getLogger("radar_vecinal")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Se ejecuta al arrancar el servidor: carga los datos de demostración en memoria."""
    cargar_datos_iniciales()
    yield


app = FastAPI(
    title="Radar Vecinal API",
    version="0.1.0",
    description=(
        "Seguridad ciudadana comunitaria. Dos actores: **Vecino** (reporta incidentes) y "
        "**Municipalidad** (responde con acciones). Datos en memoria."
    ),
    lifespan=lifespan,
)

# CORS: permite que el frontend Angular (localhost:4200) consuma la API desde el navegador.
# X-Usuario-Id debe estar permitido porque el interceptor lo envía en cada petición.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://127.0.0.1:4200"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-Usuario-Id"],
)

app.include_router(auth_router)
app.include_router(usuarios_router)
app.include_router(barrios_router)
app.include_router(reportes_router)
app.include_router(acciones_router)
app.include_router(iniciativas_router)
app.include_router(paneles_router)
app.include_router(demo_errores_router)


@app.get("/", tags=["inicio"], summary="Comprobar que el servidor funciona")
def inicio() -> dict[str, str]:
    return {"mensaje": "Radar Vecinal API funcionando. Documentación en /docs"}


# ----------------------------------------------------------------------------------------
# Manejo de errores: cada `raise` de los servicios se convierte en una respuesta JSON
# con el código HTTP correcto. Formato único: {"status": 404, "detail": "mensaje"}.
# ----------------------------------------------------------------------------------------
def respuesta_error(codigo: int, mensaje: str) -> JSONResponse:
    return JSONResponse(status_code=codigo, content={"status": codigo, "detail": mensaje})


@app.exception_handler(SolicitudIncorrectaError)
async def solicitud_incorrecta_handler(request: Request, exc: SolicitudIncorrectaError) -> JSONResponse:
    return respuesta_error(status.HTTP_400_BAD_REQUEST, str(exc))


@app.exception_handler(NoAutenticadoError)
async def no_autenticado_handler(request: Request, exc: NoAutenticadoError) -> JSONResponse:
    return respuesta_error(status.HTTP_401_UNAUTHORIZED, str(exc))


@app.exception_handler(AccesoDenegadoError)
async def acceso_denegado_handler(request: Request, exc: AccesoDenegadoError) -> JSONResponse:
    return respuesta_error(status.HTTP_403_FORBIDDEN, str(exc))


@app.exception_handler(NoEncontradoError)
async def no_encontrado_handler(request: Request, exc: NoEncontradoError) -> JSONResponse:
    return respuesta_error(status.HTTP_404_NOT_FOUND, str(exc))


@app.exception_handler(ConflictoError)
async def conflicto_handler(request: Request, exc: ConflictoError) -> JSONResponse:
    return respuesta_error(status.HTTP_409_CONFLICT, str(exc))


@app.exception_handler(RequestValidationError)
async def validacion_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """422: Pydantic rechazó el formato de los datos. Se resume en un solo texto."""
    mensajes = []
    for error in exc.errors():
        campo = ".".join(str(parte) for parte in error["loc"] if parte not in ("body", "query", "path"))
        texto = str(error["msg"]).removeprefix("Value error, ")
        mensajes.append(f"{campo}: {texto}" if campo else texto)
    return respuesta_error(status.HTTP_422_UNPROCESSABLE_CONTENT, "; ".join(mensajes))


@app.exception_handler(StarletteHTTPException)
async def http_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Errores propios de Starlette (ruta inexistente 404, método no permitido 405, ...)."""
    return respuesta_error(exc.status_code, str(exc.detail))


@app.exception_handler(Exception)
async def error_inesperado_handler(request: Request, exc: Exception) -> JSONResponse:
    """500: cualquier fallo no previsto. El detalle queda en el log, no se muestra al cliente."""
    logger.error(
        "Error no controlado en %s %s",
        request.method,
        request.url.path,
        exc_info=(type(exc), exc, exc.__traceback__),
    )
    return respuesta_error(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "Error interno del servidor. Inténtalo nuevamente más tarde.",
    )
