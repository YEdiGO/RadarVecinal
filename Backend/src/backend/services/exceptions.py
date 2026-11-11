"""Excepciones de negocio.

Los servicios las lanzan con `raise` y `main.py` las convierte en respuestas HTTP:

    SolicitudIncorrectaError -> 400 Bad Request
    NoAutenticadoError       -> 401 Unauthorized
    AccesoDenegadoError      -> 403 Forbidden
    NoEncontradoError        -> 404 Not Found
    ConflictoError           -> 409 Conflict
    cualquier otra Exception -> 500 Internal Server Error
(los datos con formato inválido los rechaza FastAPI/Pydantic con 422).
"""


class SolicitudIncorrectaError(Exception):
    """400: los datos son válidos en formato, pero rompen una regla de negocio."""


class NoAutenticadoError(Exception):
    """401: falta iniciar sesión o las credenciales no son correctas."""


class AccesoDenegadoError(Exception):
    """403: el usuario está identificado, pero no tiene permiso para esta acción."""


class NoEncontradoError(Exception):
    """404: el recurso solicitado no existe."""

    def __init__(self, recurso: str, identificador: str) -> None:
        self.recurso = recurso
        self.identificador = identificador
        super().__init__(f"No existe {recurso} con id '{identificador}'.")


class ConflictoError(Exception):
    """409: la acción choca con el estado actual (duplicado, ya realizada, etc.)."""
