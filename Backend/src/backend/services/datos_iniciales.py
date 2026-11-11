"""Datos de demostración (los mismos del prototipo de Lovable, adaptados a 2 actores).

Se cargan una sola vez al arrancar el servidor. Luego se reemplazarán por la base de datos.
Todas las cuentas de prueba usan la contraseña 123456.
"""

from datetime import UTC, datetime, timedelta

from backend.repositories.acciones import accion_repository
from backend.repositories.barrios import barrio_repository
from backend.repositories.iniciativas import iniciativa_repository
from backend.repositories.reportes import reporte_repository
from backend.repositories.usuarios import usuario_repository
from backend.schemas.acciones import Accion
from backend.schemas.iniciativas import Iniciativa
from backend.schemas.reportes import Reporte
from backend.schemas.usuarios import UsuarioDB
from backend.services.temperatura import GRAVEDAD, barrio_del_punto, punto_en_poligono
from backend.services.usuarios import hashear

NOMBRES = [
    "Rosa Quispe", "Juan Huamán", "María Rojas", "Carlos Poma", "Lucía Ccanto",
    "Pedro Mendoza", "Ana Taipe", "Luis Cárdenas", "Elena Soto", "Jorge Inga",
    "Carmen Ríos", "Raúl Chávez", "Sofía Yupanqui", "Diego Ramos", "Patricia Vila",
]  # fmt: skip

DESCRIPCION_POR_TIPO = {
    "asalto_robo": "Robo a transeúnte en la esquina",
    "pandillaje": "Grupo de jóvenes generando disturbios",
    "alcohol_drogas": "Personas bebiendo en la vía pública",
    "falta_alumbrado": "Poste de luz apagado desde hace días",
    "actividad_sospechosa": "Vehículo estacionado con personas observando casas",
    "otro": "Ruidos fuertes de madrugada",
}


def _cargar_usuarios(ahora: datetime) -> None:
    barrios = barrio_repository.list()
    clave = hashear("123456")

    # 15 vecinos verificados repartidos en los 5 barrios. El primero es el de la demo.
    for i, nombre in enumerate(NOMBRES):
        usuario_repository.add(
            UsuarioDB(
                id=f"v{i + 1}",
                nombre=nombre,
                correo="vecino@barrio.com" if i == 0 else f"vecino{i + 1}@radar.pe",
                rol="vecino",
                id_barrio=barrios[i % 5].id,
                estado="Verificado",
                fecha_registro=ahora - timedelta(days=60),
                clave_hash=clave,
            )
        )

    # 3 vecinos pendientes: la Municipalidad debe aprobarlos o rechazarlos.
    pendientes = [("Miguel Arias", "b1"), ("Gloria Palacios", "b2"), ("Hugo Salazar", "b3")]
    for i, (nombre, id_barrio) in enumerate(pendientes, start=1):
        usuario_repository.add(
            UsuarioDB(
                id=f"v{15 + i}",
                nombre=nombre,
                correo=f"pendiente{i}@radar.pe",
                rol="vecino",
                id_barrio=id_barrio,
                estado="Pendiente",
                fecha_registro=ahora - timedelta(days=i),
                clave_hash=clave,
            )
        )

    # Segundo actor: la Municipalidad (y su Central de Serenazgo).
    for id_usuario, nombre, correo, institucion in [
        ("m1", "Gerencia de Seguridad Ciudadana", "muni@huancayo.gob.pe", "Municipalidad"),
        ("m2", "Central de Serenazgo", "serenazgo@huancayo.gob.pe", "Serenazgo"),
    ]:
        usuario_repository.add(
            UsuarioDB(
                id=id_usuario,
                nombre=nombre,
                correo=correo,
                rol="municipalidad",
                id_barrio=None,
                estado="Verificado",
                fecha_registro=ahora - timedelta(days=90),
                institucion=institucion,
                clave_hash=clave,
            )
        )


def _cargar_reportes(ahora: datetime) -> None:
    """40 reportes (8 por barrio) con puntos deterministas dentro de cada polígono."""
    barrios = barrio_repository.list()
    tipos = ["asalto_robo", "pandillaje", "falta_alumbrado", "actividad_sospechosa", "otro"]
    for bi, barrio in enumerate(barrios):
        lats = [p[0] for p in barrio.poligono]
        lngs = [p[1] for p in barrio.poligono]
        sur, norte, oeste, este = min(lats), max(lats), min(lngs), max(lngs)
        puntos: list[tuple[float, float]] = []
        k = 1
        while len(puntos) < 8 and k < 1000:
            lat = sur + (norte - sur) * (0.12 + ((k * 37) % 77) / 100)
            lng = oeste + (este - oeste) * (0.12 + ((k * 53) % 77) / 100)
            if punto_en_poligono(lat, lng, barrio.poligono):
                puntos.append((lat, lng))
            k += 1
        tipo = tipos[bi]
        for i, (lat, lng) in enumerate(puntos):
            # Cada barrio tiene una "antigüedad" distinta para que los colores varíen.
            dias = [i % 3, i % 5, i % 8, 12 + i, 23 + i][bi]
            reporte_repository.add(
                Reporte(
                    id=f"r{bi * 8 + i + 1}",
                    id_usuario=f"v{(i % 15) + 1}",
                    lat=lat,
                    lng=lng,
                    id_barrio=(barrio_del_punto(lat, lng, barrios) or barrio).id,
                    tipo=tipo,
                    gravedad=GRAVEDAD[tipo],
                    descripcion=DESCRIPCION_POR_TIPO[tipo],
                    fecha=ahora - timedelta(days=dias),
                    estado="activo",
                    confirmaciones=1 if bi == 0 else 0,
                )
            )


def _cargar_iniciativas() -> None:
    datos = [
        ("i1", "b1", "v1", "Ronda vecinal nocturna", "Turnos de vigilancia los fines de semana.", "20 vecinos inscritos", "En curso", 14, None),
        ("i2", "b2", "v2", "Pedido de alumbrado", "Solicitud formal de reparación de postes.", "100 firmas", "Cumplida", 112, 6.2),
        ("i3", "b3", "v3", "Alarma comunitaria", "Instalar alarma con botón en 10 casas.", "S/ 1500 recaudados", "Propuesta", 5, None),
        ("i4", "b2", "v7", "Recuperación del parque", "Limpieza y actividades deportivas.", "3 jornadas", "En curso", 30, None),
        ("i5", "b1", "v6", "Cámaras vecinales", "Propuesta descartada por presupuesto.", "4 cámaras", "Cancelada", 8, None),
    ]  # fmt: skip
    for id_, barrio, creador, titulo, descripcion, meta, estado, participantes, temp in datos:
        iniciativa_repository.add(
            Iniciativa(
                id=id_,
                id_barrio=barrio,
                id_creador=creador,
                titulo=titulo,
                descripcion=descripcion,
                meta=meta,
                estado=estado,
                participantes=participantes,
                temperatura_al_cumplir=temp,
            )
        )


def _cargar_acciones(ahora: datetime) -> None:
    datos = [
        ("a1", "b1", "m2", "Serenazgo", "Patrullaje de serenazgo", "Patrullaje reforzado", "Se incrementaron rondas de 18:00 a 02:00.", -2, "En ejecución", None),
        ("a2", "b1", "m1", "Municipalidad", "Alumbrado", "Reparación de postes", "Se cambiaron 12 luminarias LED.", -6, "Completada", 9.1),
        ("a3", "b2", "m1", "Municipalidad", "Otro", "Limpieza de terreno baldío", "Retiro de maleza y desmonte.", 3, "Planificada", None),
        ("a4", "b3", "m2", "Serenazgo", "Patrullaje de serenazgo", "Punto fijo de serenazgo", "Unidad fija en la esquina del parque.", -1, "En ejecución", None),
        ("a5", "b4", "m1", "Municipalidad", "Otro", "Instalación de cámara", "Cámara conectada a la central.", -15, "Completada", 8.4),
        ("a6", "b5", "m1", "Municipalidad", "Campaña de prevención", "Charla de prevención", "Taller con las juntas vecinales.", 7, "Planificada", None),
    ]  # fmt: skip
    for id_, barrio, autoridad, institucion, tipo, titulo, descripcion, dias, estado, temp in datos:
        accion_repository.add(
            Accion(
                id=id_,
                id_barrio=barrio,
                id_autoridad=autoridad,
                institucion=institucion,
                tipo=tipo,
                titulo=titulo,
                descripcion=descripcion,
                fecha=ahora + timedelta(days=dias),
                estado=estado,
                fotos=[],
                temperatura_al_completar=temp,
            )
        )


def cargar_datos_iniciales() -> None:
    ahora = datetime.now(UTC)
    _cargar_usuarios(ahora)
    _cargar_reportes(ahora)
    _cargar_iniciativas()
    _cargar_acciones(ahora)
