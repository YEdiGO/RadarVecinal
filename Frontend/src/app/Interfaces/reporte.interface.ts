export type TipoIncidente =
  | 'asalto_robo'
  | 'pandillaje'
  | 'alcohol_drogas'
  | 'falta_alumbrado'
  | 'actividad_sospechosa'
  | 'otro';

export type EstadoReporte = 'activo' | 'confirmado' | 'falso' | 'archivado';
export type VotoReporte = 'confirmo' | 'incorrecto';

/** Reporte sin autor: es lo que ve cualquier usuario. */
export interface ReportePublico {
  id: string;
  lat: number;
  lng: number;
  id_barrio: string;
  tipo: TipoIncidente;
  gravedad: number;
  descripcion: string;
  fecha: string;
  estado: EstadoReporte;
  confirmaciones: number;
}

/** Reporte propio (incluye id_usuario). */
export interface Reporte extends ReportePublico {
  id_usuario: string;
}

export interface ReporteDetalle extends ReportePublico {
  propio: boolean;
  mi_voto: VotoReporte | null;
  denunciado: boolean;
  incorrectos: number;
}

/** Datos que se envían al crear o editar un reporte. */
export interface ReporteDatos {
  lat: number;
  lng: number;
  tipo: TipoIncidente;
  descripcion: string;
}
