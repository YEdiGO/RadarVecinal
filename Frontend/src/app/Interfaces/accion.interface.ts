export type TipoAccion =
  | 'Patrullaje de serenazgo'
  | 'Operativo con la policía'
  | 'Alumbrado'
  | 'Campaña de prevención'
  | 'Otro';

export type EstadoAccion = 'Planificada' | 'En ejecución' | 'Completada';

/** Acción de respuesta que registra la Municipalidad en un barrio. */
export interface Accion {
  id: string;
  id_barrio: string;
  id_autoridad: string;
  institucion: string;
  tipo: TipoAccion;
  titulo: string;
  descripcion: string;
  fecha: string;
  estado: EstadoAccion;
  fotos: string[];
  /** Reporte ciudadano al que responde esta acción, si aplica. */
  id_reporte: string | null;
  fecha_registro: string | null;
  temperatura_al_completar: number | null;
}

export interface AccionDatos {
  id_barrio: string;
  tipo: TipoAccion;
  titulo: string;
  descripcion: string;
  /** Formato AAAA-MM-DD. */
  fecha: string;
  estado: EstadoAccion;
  fotos: string[];
  /** Opcional: respuesta a un reporte concreto. */
  id_reporte?: string | null;
}
