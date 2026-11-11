// Los nombres de los campos coinciden con los del backend (snake_case).

export type Rol = 'vecino' | 'municipalidad';
export type EstadoUsuario = 'Pendiente' | 'Verificado' | 'Rechazado';

export interface Usuario {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  id_barrio: string | null;
  estado: EstadoUsuario;
  fecha_registro: string;
  institucion: string | null;
}

export interface LoginDatos {
  correo: string;
  clave: string;
}

export interface RegistroDatos {
  nombre: string;
  correo: string;
  clave: string;
  id_barrio: string;
}
