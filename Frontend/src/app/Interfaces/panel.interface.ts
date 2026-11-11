import { Accion } from './accion.interface';
import { ReportePublico } from './reporte.interface';
import { Usuario } from './usuario.interface';
import { PuntoCaliente, ZonaResumen } from './zona.interface';

export interface Alerta {
  id: string;
  id_barrio: string;
  inicio: string;
  expira: string;
}

export interface PanelMunicipal {
  zonas: ZonaResumen[];
  criticos: ZonaResumen[];
  acciones: Accion[];
  propias: Accion[];
  pendientes: Usuario[];
  reportes: ReportePublico[];
  puntos: PuntoCaliente[];
}

export interface MiBarrio {
  zona: ZonaResumen | null;
  reportes: ReportePublico[];
  noticias: Accion[];
}
