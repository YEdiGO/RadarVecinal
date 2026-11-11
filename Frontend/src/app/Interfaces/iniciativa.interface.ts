export type EstadoIniciativa = 'Propuesta' | 'En curso' | 'Cumplida' | 'Cancelada';

export interface Iniciativa {
  id: string;
  id_barrio: string;
  id_creador: string;
  titulo: string;
  descripcion: string;
  meta: string;
  estado: EstadoIniciativa;
  participantes: number;
  temperatura_al_cumplir: number | null;
}

export interface IniciativaConParticipacion extends Iniciativa {
  sumado: boolean;
  es_mia: boolean;
}

export interface IniciativaDatos {
  titulo: string;
  descripcion: string;
  meta: string;
  estado: EstadoIniciativa;
}
