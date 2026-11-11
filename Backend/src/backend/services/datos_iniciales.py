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
    "Rosa Quispe",
    "Juan Huamán",
    "María Rojas",
    "Carlos Poma",
    "Lucía Ccanto",
    "Pedro Mendoza",
    "Ana Taipe",
    "Luis Cárdenas",
    "Elena Soto",
    "Jorge Inga",
    "Carmen Ríos",
    "Raúl Chávez",
    "Sofía Yupanqui",
    "Diego Ramos",
    "Patricia Vila",
    "Julio Ccahuana",
    "Marisol Laura",
    "Percy Quispe",
    "Yolanda Canchanya",
    "Fredy Baldeón",
    "Norma Pariona",
    "Alfredo Yupanqui",
    "Karina Camarena",
    "Rubén Sulca",
    "Betty Paucar",
    "Héctor Contreras",
    "Milagros Rojas",
    "Óscar Espinoza",
    "Diana Aylas",
    "Wilmer Torres",
    "Gladys Chuquillanqui",
    "César Santos",
    "Verónica Landa",
    "Abelardo Ñahui",
    "Roxana Cisneros",
    "Teodoro Mucha",
]  # fmt: skip

DESCRIPCIONES_POR_TIPO = {
    "asalto_robo": [
        "Robo a transeúnte en la esquina",
        "Asalto con arma blanca cerca del paradero",
        "Arrebato de celular a una vecina",
    ],
    "pandillaje": [
        "Grupo de jóvenes generando disturbios",
        "Pandilla reuniéndose en la losa deportiva",
        "Disturbios y peleas al anochecer",
    ],
    "alcohol_drogas": [
        "Personas bebiendo en la vía pública",
        "Consumo de drogas junto al parque",
        "Botellas y desorden tras una reunión",
    ],
    "falta_alumbrado": [
        "Poste de luz apagado desde hace días",
        "Tramo de la calle sin alumbrado",
        "Luminaria intermitente y zona oscura",
    ],
    "actividad_sospechosa": [
        "Vehículo estacionado con personas observando casas",
        "Desconocidos rondando la manzana",
        "Persona forzando puertas de garaje",
    ],
    "otro": [
        "Ruidos fuertes de madrugada",
        "Perros agresivos sin dueño en la calle",
        "Terreno baldío con basura acumulada",
    ],
}

# Puntos de referencia por barrio: hacen que dos reportes nunca se lean igual.
REFERENCIAS = {
    "b1": ["Av. Huancavelica", "Jr. Cuzco", "plaza San Carlos", "Jr. Puno"],
    "b2": ["Av. Independencia", "Jr. Los Andes", "mercado Azapampa", "Jr. Manco Cápac"],
    "b3": ["Av. Ocopilla", "Jr. Arequipa", "IE Ocopilla", "Jr. Cusco"],
    "b4": ["Av. Pío Pata", "Jr. Amazonas", "mirador Pío Pata", "Jr. San Martín"],
    "b5": ["Av. Cerrito", "Jr. Junín", "Torre Torre", "Jr. Grau"],
    "b6": ["Av. Cahuide", "Jr. Lima", "parque El Tambo", "Av. Huancayo"],
    "b7": ["Av. Chilca", "Jr. Libertad", "mercado Chilca", "Jr. Tarma"],
    "b8": ["Av. San Pedro", "Jr. Áncash", "IE San Pedro", "Jr. La Merced"],
    "b9": ["Av. La Rivera", "Jr. Puno", "puente La Rivera", "Jr. Ica"],
    "b10": ["Av. Cajas", "Jr. Tarapacá", "mercado Cajas", "Jr. Arequipa"],
    "b11": ["Av. San Antonio", "Jr. Ayacucho", "IES San Antonio", "Jr. Moquegua"],
    "b12": ["Av. Incho", "Jr. Huánuco", "parque Incho", "Jr. Cajamarca"],
}

# Tipos ponderados: los robos y el pandillaje generan más calor en el mapa.
TIPOS_REPORTE = [
    "asalto_robo",
    "asalto_robo",
    "pandillaje",
    "falta_alumbrado",
    "alcohol_drogas",
    "actividad_sospechosa",
    "otro",
]

# Cada barrio recibe un perfil distinto para que el mapa tenga zonas verdes, naranjas y rojas.
# (cantidad de reportes, días más antiguos, días más recientes)
PERFILES_REPORTES = [
    (6, 18, 48),
    (9, 9, 28),
    (13, 3, 16),
    (17, 0, 8),
]


def _cargar_usuarios(ahora: datetime) -> None:
    barrios = barrio_repository.list()
    clave = hashear("123456")

    # Tres vecinos verificados por barrio (36 en total). El primero es el de la demo.
    for i, nombre in enumerate(NOMBRES):
        usuario_repository.add(
            UsuarioDB(
                id=f"v{i + 1}",
                nombre=nombre,
                correo="vecino@barrio.com" if i == 0 else f"vecino{i + 1}@radar.pe",
                rol="vecino",
                id_barrio=barrios[i % len(barrios)].id,
                estado="Verificado",
                fecha_registro=ahora - timedelta(days=60),
                clave_hash=clave,
            )
        )

    # Vecinos pendientes: la Municipalidad debe aprobarlos o rechazarlos.
    pendientes = [
        ("Miguel Arias", "b4"),
        ("Gloria Palacios", "b7"),
        ("Hugo Salazar", "b10"),
        ("Rita Campos", "b2"),
    ]
    for i, (nombre, id_barrio) in enumerate(pendientes, start=1):
        usuario_repository.add(
            UsuarioDB(
                id=f"v{len(NOMBRES) + i}",
                nombre=nombre,
                correo=f"pendiente{i}@radar.pe",
                rol="vecino",
                id_barrio=id_barrio,
                estado="Pendiente",
                fecha_registro=ahora - timedelta(days=i),
                clave_hash=clave,
            )
        )

    # Segundo actor: la Municipalidad.
    usuario_repository.add(
        UsuarioDB(
            id="m1",
            nombre="Gerencia de Seguridad Ciudadana",
            correo="muni@huancayo.gob.pe",
            rol="municipalidad",
            id_barrio=None,
            estado="Verificado",
            fecha_registro=ahora - timedelta(days=90),
            institucion="Municipalidad",
            clave_hash=clave,
        )
    )


def _cargar_reportes(ahora: datetime) -> None:
    """Reportes deterministas dentro de cada polígono, con perfiles de calor variados."""
    barrios = barrio_repository.list()
    vecinos = [u for u in usuario_repository.list() if u.rol == "vecino"]
    contador = 0

    for bi, barrio in enumerate(barrios):
        lats = [p[0] for p in barrio.poligono]
        lngs = [p[1] for p in barrio.poligono]
        sur, norte, oeste, este = min(lats), max(lats), min(lngs), max(lngs)

        cantidad, dias_desde, dias_hasta = PERFILES_REPORTES[bi % len(PERFILES_REPORTES)]
        cantidad += bi % 3
        rango_dias = max(1, dias_hasta - dias_desde + 1)

        autores = [u.id for u in vecinos if u.id_barrio == barrio.id] or [u.id for u in vecinos]

        puntos: list[tuple[float, float]] = []
        k = 1
        while len(puntos) < cantidad and k < 5000:
            lat = sur + (norte - sur) * (0.1 + ((k * 37) % 81) / 100)
            lng = oeste + (este - oeste) * (0.1 + ((k * 53) % 81) / 100)
            if punto_en_poligono(lat, lng, barrio.poligono):
                puntos.append((lat, lng))
            k += 1

        for i, (lat, lng) in enumerate(puntos):
            tipo = TIPOS_REPORTE[(i * 3 + bi) % len(TIPOS_REPORTE)]
            descripciones = DESCRIPCIONES_POR_TIPO[tipo]
            referencias = REFERENCIAS.get(barrio.id, ["la zona"])
            confirmaciones = (i * 2 + bi) % 4
            dias = dias_desde + ((i * 37 + bi * 11) % rango_dias)
            # Pequeño desplazamiento determinista para que no queden puntos superpuestos.
            lat += (((i * 17 + bi * 5) % 7) - 3) * 0.00016
            lng += (((i * 29 + bi * 3) % 7) - 3) * 0.00016
            descripcion = (
                f"{descripciones[(i + bi) % len(descripciones)]} · "
                f"{referencias[(i + bi) % len(referencias)]}, "
                f"Mz. {chr(65 + (i + bi) % 5)}"
            )
            contador += 1
            reporte_repository.add(
                Reporte(
                    id=f"r{contador}",
                    id_usuario=autores[i % len(autores)],
                    lat=lat,
                    lng=lng,
                    id_barrio=(barrio_del_punto(lat, lng, barrios) or barrio).id,
                    tipo=tipo,
                    gravedad=GRAVEDAD[tipo],
                    descripcion=descripcion,
                    fecha=ahora - timedelta(days=dias, hours=(i * 5) % 24),
                    estado="confirmado" if confirmaciones >= 3 else "activo",
                    confirmaciones=confirmaciones,
                )
            )


def _cargar_iniciativas() -> None:
    datos = [
        ("i1", "b1", "v1", "Ronda vecinal nocturna", "Turnos de vigilancia los fines de semana.", "20 vecinos inscritos", "En curso", 14, None),
        ("i2", "b2", "v2", "Pedido de alumbrado", "Solicitud formal de reparación de postes.", "100 firmas", "Cumplida", 112, 6.2),
        ("i3", "b3", "v3", "Alarma comunitaria", "Instalar alarma con botón en 10 casas.", "S/ 1500 recaudados", "Propuesta", 5, None),
        ("i4", "b2", "v7", "Recuperación del parque", "Limpieza y actividades deportivas.", "3 jornadas", "En curso", 30, None),
        ("i5", "b1", "v6", "Cámaras vecinales", "Propuesta descartada por presupuesto.", "4 cámaras", "Cancelada", 8, None),
        ("i6", "b4", "v10", "Luz para Pío Pata", "Cambio de luminarias en las calles altas.", "15 postes", "En curso", 27, None),
        ("i7", "b6", "v18", "Vecinos en alerta", "Red de mensajes para avisos inmediatos.", "60 vecinos", "Propuesta", 12, None),
        ("i8", "b7", "v21", "Cancha segura", "Recuperar la losa deportiva y cerrarla de noche.", "1 losa", "En curso", 41, None),
        ("i9", "b8", "v24", "Botones de pánico", "Instalar botones en las esquinas con más robos.", "6 botones", "Propuesta", 9, None),
        ("i10", "b9", "v27", "Huertos comunitarios", "Convertir un terreno baldío en huerto vecinal.", "1 terreno", "En curso", 23, None),
        ("i11", "b10", "v30", "Muro y luces", "Cerrar el pasaje oscuro y colocar reflectores.", "80 metros", "Propuesta", 7, None),
        ("i12", "b11", "v33", "Campaña de valores", "Talleres de convivencia para jóvenes.", "4 talleres", "Cumplida", 64, 12.8),
        ("i13", "b12", "v36", "Jornada de limpieza", "Retirar basura acumulada en la quebrada.", "2 jornadas", "En curso", 35, None),
        ("i14", "b5", "v15", "Feria de seguridad", "Feria informativa con Serenazgo y Policía.", "1 feria", "Cumplida", 90, 8.1),
        ("i15", "b3", "v9", "Veredas iluminadas", "Mejorar veredas y alumbrado del ingreso.", "300 metros", "Propuesta", 18, None),
        ("i16", "b1", "v3", "Directorio de emergencia", "Directorio de contactos útiles por manzana.", "1 directorio", "Cumplida", 48, 4.4),
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
        ("a1", "b1", "m1", "Municipalidad", "Patrullaje de serenazgo", "Patrullaje reforzado", "Se incrementaron rondas de 18:00 a 02:00.", -2, "En ejecución", None),
        ("a2", "b1", "m1", "Municipalidad", "Alumbrado", "Reparación de postes", "Se cambiaron 12 luminarias LED.", -6, "Completada", 9.1),
        ("a3", "b2", "m1", "Municipalidad", "Otro", "Limpieza de terreno baldío", "Retiro de maleza y desmonte.", 3, "Planificada", None),
        ("a4", "b3", "m1", "Municipalidad", "Patrullaje de serenazgo", "Punto fijo de serenazgo", "Unidad fija en la esquina del parque.", -1, "En ejecución", None),
        ("a5", "b4", "m1", "Municipalidad", "Otro", "Instalación de cámara", "Cámara conectada a la central.", -15, "Completada", 8.4),
        ("a6", "b5", "m1", "Municipalidad", "Campaña de prevención", "Charla de prevención", "Taller con las juntas vecinales.", 7, "Planificada", None),
        ("a7", "b6", "m1", "Municipalidad", "Patrullaje de serenazgo", "Patrullaje disuasivo en El Tambo", "Rondas por las calles principales del sector.", -4, "En ejecución", None),
        ("a8", "b7", "m1", "Municipalidad", "Alumbrado", "Reposición de luminarias en Chilca", "Se repusieron 18 luminarias LED.", -9, "Completada", 26.4),
        ("a9", "b9", "m1", "Municipalidad", "Campaña de prevención", "Feria de seguridad vecinal", "Feria informativa en la plaza del barrio.", 5, "Planificada", None),
        ("a10", "b10", "m1", "Municipalidad", "Alumbrado", "Ampliación de red eléctrica", "Nuevos postes en el pasaje alto.", 8, "Planificada", None),
        ("a11", "b12", "m1", "Municipalidad", "Otro", "Mantenimiento de cámaras", "Se repararon las cámaras de la avenida.", -20, "Completada", 41.2),
        ("a12", "b5", "m1", "Municipalidad", "Patrullaje de serenazgo", "Refuerzo de vigilancia", "Patrulla adicional los fines de semana.", -2, "En ejecución", None),
        ("a13", "b3", "m1", "Municipalidad", "Alumbrado", "Cambio de 20 luminarias", "Intervención completa en el sector.", -5, "Completada", 21.7),
        ("a14", "b1", "m1", "Municipalidad", "Operativo con la policía", "Control de identidad", "Operativo conjunto en la avenida principal.", -8, "Completada", 14.3),
        ("a15", "b2", "m1", "Municipalidad", "Campaña de prevención", "Taller para juntas vecinales", "Capacitación sobre rutas de denuncia.", 10, "Planificada", None),
        ("a16", "b4", "m1", "Municipalidad", "Alumbrado", "Reparación de poste averiado", "El poste de la esquina ya está operativo.", -3, "En ejecución", None),
        ("a17", "b8", "m1", "Municipalidad", "Operativo con la policía", "Operativo en San Pedro", "Patrullaje conjunto en zonas críticas.", 2, "Planificada", None),
        ("a18", "b11", "m1", "Municipalidad", "Otro", "Señalización de calles", "Nuevos letreros y señalética peatonal.", 12, "Planificada", None),
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

    # Algunas acciones responden a un reporte concreto: el vecino ve la respuesta en su reporte.
    respuestas = {
        "a1": "b1",
        "a4": "b3",
        "a7": "b6",
        "a12": "b5",
        "a16": "b4",
        "a17": "b8",
    }
    for id_accion, id_barrio in respuestas.items():
        accion = accion_repository.get(id_accion)
        reporte = next(
            (
                r
                for r in reporte_repository.list()
                if r.id_barrio == id_barrio and r.estado != "archivado"
            ),
            None,
        )
        if accion and reporte:
            accion_repository.update(accion.model_copy(update={"id_reporte": reporte.id}))


def cargar_datos_iniciales() -> None:
    ahora = datetime.now(UTC)
    _cargar_usuarios(ahora)
    _cargar_reportes(ahora)
    _cargar_iniciativas()
    _cargar_acciones(ahora)
