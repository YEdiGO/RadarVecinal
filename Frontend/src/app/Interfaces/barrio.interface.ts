export interface Barrio {
  id: string;
  nombre: string;
  /** Lista de puntos [latitud, longitud]. */
  poligono: [number, number][];
}
