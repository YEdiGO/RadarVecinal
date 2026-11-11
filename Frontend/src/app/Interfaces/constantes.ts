import { EstadoAccion, TipoAccion } from './accion.interface';
import { EstadoIniciativa } from './iniciativa.interface';
import { TipoIncidente } from './reporte.interface';
import { NivelTemperatura } from './zona.interface';
import { Rol } from './usuario.interface';

export const ETIQUETA_TIPO: Record<TipoIncidente, string> = {
  asalto_robo: 'Asalto o robo',
  pandillaje: 'Pandillaje',
  alcohol_drogas: 'Zona de consumo de alcohol o drogas',
  falta_alumbrado: 'Falta de alumbrado',
  actividad_sospechosa: 'Actividad sospechosa',
  otro: 'Otro',
};

/** Lista de tipos en el orden en que se muestran en el formulario. */
export const TIPOS_INCIDENTE = Object.keys(ETIQUETA_TIPO) as TipoIncidente[];

export const ETIQUETA_NIVEL: Record<NivelTemperatura, string> = {
  verde: 'Tranquila',
  amarillo: 'Atención',
  naranja: 'Alerta',
  rojo: 'Crítica',
};

export const NIVELES: NivelTemperatura[] = ['verde', 'amarillo', 'naranja', 'rojo'];

/** Mismos colores que --heat-* de styles.css (Leaflet necesita el valor directo). */
export const COLOR_NIVEL: Record<NivelTemperatura, string> = {
  verde: '#2eb872',
  amarillo: '#f5c518',
  naranja: '#f58b1f',
  rojo: '#d9382b',
};

export const TIPOS_ACCION: TipoAccion[] = [
  'Patrullaje de serenazgo',
  'Operativo con la policía',
  'Alumbrado',
  'Campaña de prevención',
  'Otro',
];

export const ESTADOS_ACCION: EstadoAccion[] = ['Planificada', 'En ejecución', 'Completada'];

export const ESTADOS_INICIATIVA: EstadoIniciativa[] = ['Propuesta', 'En curso', 'Cumplida', 'Cancelada'];

/** Pantalla principal de cada actor después de iniciar sesión. */
export const INICIO_POR_ROL: Record<Rol, string> = {
  vecino: '/',
  municipalidad: '/municipalidad',
};

export const CENTRO_HUANCAYO = { lat: -12.0651, lng: -75.2049 };
