from backend.schemas.reportes import Reporte


class ReporteRepository:
    """Reportes, votos y denuncias en memoria."""

    def __init__(self) -> None:
        self._reportes: dict[str, Reporte] = {}
        # id_reporte -> {id_usuario: "confirmo" | "incorrecto"}
        self._votos: dict[str, dict[str, str]] = {}
        # id_reporte -> {id_usuario, ...}
        self._denuncias: dict[str, set[str]] = {}

    # --- reportes ---
    def list(self) -> list[Reporte]:
        return list(self._reportes.values())

    def get(self, id_reporte: str) -> Reporte | None:
        return self._reportes.get(id_reporte)

    def add(self, reporte: Reporte) -> Reporte:
        self._reportes[reporte.id] = reporte
        return reporte

    def update(self, reporte: Reporte) -> Reporte:
        self._reportes[reporte.id] = reporte
        return reporte

    def delete(self, id_reporte: str) -> bool:
        self._votos.pop(id_reporte, None)
        self._denuncias.pop(id_reporte, None)
        return self._reportes.pop(id_reporte, None) is not None

    # --- votos ---
    def votos_de(self, id_reporte: str) -> dict[str, str]:
        return self._votos.setdefault(id_reporte, {})

    # --- denuncias ---
    def denuncias_de(self, id_reporte: str) -> set[str]:
        return self._denuncias.setdefault(id_reporte, set())


reporte_repository = ReporteRepository()
