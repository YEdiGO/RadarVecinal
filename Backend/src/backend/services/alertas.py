from datetime import UTC, datetime, timedelta
from uuid import uuid4

from backend.repositories.alertas import AlertaRepository, alerta_repository
from backend.schemas.paneles import Alerta
from backend.schemas.usuarios import UsuarioDB
from backend.services.exceptions import SolicitudIncorrectaError

DURACION_ALERTA = timedelta(minutes=30)


class AlertaService:
    """Alertas de barrio: un vecino activa una y el barrio queda 'EN ALERTA' 30 minutos."""

    def __init__(self, repository: AlertaRepository | None = None) -> None:
        self._repository = repository or alerta_repository

    def activas(self) -> list[Alerta]:
        ahora = datetime.now(UTC)
        return [a for a in self._repository.list() if a.expira > ahora]

    def activar(self, usuario: UsuarioDB) -> Alerta:
        if usuario.id_barrio is None:
            raise SolicitudIncorrectaError("No tienes un barrio asignado.")
        ahora = datetime.now(UTC)
        previa = self._repository.get(usuario.id_barrio)
        if previa is not None and previa.expira > ahora:
            return previa  # una alerta activa nunca se extiende: dura siempre 30 minutos
        alerta = Alerta(
            id=f"alerta_{uuid4().hex[:8]}",
            id_barrio=usuario.id_barrio,
            inicio=ahora,
            expira=ahora + DURACION_ALERTA,
        )
        return self._repository.set(alerta)


alerta_service = AlertaService()
