import { TipoIncidente } from './reporte.interface';

export type NivelTemperatura = 'verde' | 'amarillo' | 'naranja' | 'rojo';

export interface ZonaResumen {
  id: string;
  nombre: string;
  poligono: [number, number][];
  temperatura: number;
  nivel: NivelTemperatura;
  cantidad: number;
  tipos_frecuentes: { tipo: TipoIncidente; cantidad: number }[];
  ultima_actualizacion: string | null;
}

export interface PuntoCaliente {
  lat: number;
  lng: number;
  temperatura: number;
  cantidad: number;
  id_barrio: string;
}

export interface FiltrosMapa {
  tipo: TipoIncidente | 'todos';
  dias: number;
}
