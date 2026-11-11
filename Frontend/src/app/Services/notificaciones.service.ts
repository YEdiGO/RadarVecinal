import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

import { ApiError } from './api.service';

const COLOR_ACENTO = '#14b8a6';
const COLOR_PELIGRO = '#d9382b';

/** Nombre corto de cada código HTTP, para mostrarlo en la alerta de error. */
const TITULO_POR_CODIGO: Record<number, string> = {
  0: 'Sin conexión',
  400: 'Solicitud incorrecta',
  401: 'No autorizado',
  403: 'Acceso denegado',
  404: 'No encontrado',
  405: 'Acción no permitida',
  408: 'Tiempo de espera agotado',
  409: 'Conflicto',
  413: 'Archivo demasiado grande',
  422: 'Datos inválidos',
  429: 'Demasiadas solicitudes',
  500: 'Error del servidor',
};

const CLASE_ALERTA = { popup: 'radar-alerta' };

/** Todas las alertas de la aplicación usan SweetAlert2 a través de este servicio. */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  /** Mensaje pequeño que desaparece solo (arriba a la derecha). */
  exito(mensaje: string): void {
    void Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: mensaje,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
      customClass: { popup: 'radar-toast' },
    });
  }

  /** Muestra el código HTTP del error (400, 404, 500...) y el mensaje que envió el backend. */
  async error(error: unknown): Promise<void> {
    const api = error instanceof ApiError ? error : new ApiError(500, 'Ocurrió un error inesperado.');
    const codigo = api.status ? `Error ${api.status}` : 'Error';
    const titulo = TITULO_POR_CODIGO[api.status] ?? 'Error';
    await Swal.fire({
      icon: api.status === 403 || api.status === 409 ? 'warning' : 'error',
      title: `${codigo} · ${titulo}`,
      text: api.message,
      confirmButtonText: 'Entendido',
      confirmButtonColor: COLOR_ACENTO,
      customClass: CLASE_ALERTA,
    });
  }

  async aviso(titulo: string, texto: string): Promise<void> {
    await Swal.fire({
      icon: 'info',
      title: titulo,
      text: texto,
      confirmButtonText: 'Entendido',
      confirmButtonColor: COLOR_ACENTO,
      customClass: CLASE_ALERTA,
    });
  }

  /** Pregunta de confirmación: devuelve true si la persona acepta. */
  async confirmar(
    titulo: string,
    texto: string,
    textoBoton = 'Confirmar',
    peligroso = false,
  ): Promise<boolean> {
    const respuesta = await Swal.fire({
      icon: peligroso ? 'warning' : 'question',
      title: titulo,
      text: texto,
      showCancelButton: true,
      confirmButtonText: textoBoton,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: peligroso ? COLOR_PELIGRO : COLOR_ACENTO,
      reverseButtons: true,
      focusCancel: peligroso,
      customClass: CLASE_ALERTA,
    });
    return respuesta.isConfirmed;
  }
}
