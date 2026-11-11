import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, Observable, TimeoutError, timeout } from 'rxjs';

import { environment } from '../../environments/environment';

type Parametros = Record<string, string | number | null | undefined>;

const TIEMPO_MAXIMO_MS = 20_000;

/** Error HTTP ya traducido: trae el código (400, 404, 500...) y el mensaje del backend. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    mensaje: string,
  ) {
    super(mensaje);
  }

  /** true cuando el navegador no pudo llegar al backend (servidor apagado o sin red). */
  get sinConexion(): boolean {
    return this.status === 0;
  }
}

/** Texto seguro para mostrar en un estado de error dentro de una pantalla. */
export function mensajeDeError(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Ocurrió un error inesperado. Inténtalo nuevamente.';
}

/**
 * Capa base para hablar con el backend. Todas las peticiones usan async/await
 * (firstValueFrom convierte el Observable de HttpClient en una Promesa) y cualquier fallo
 * se lanza como ApiError con el código HTTP.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  get<T>(ruta: string, parametros?: Parametros): Promise<T> {
    return this.ejecutar(
      this.http.get<T>(environment.apiUrl + ruta, { params: this.limpiar(parametros) }),
    );
  }

  post<T>(ruta: string, cuerpo?: unknown): Promise<T> {
    return this.ejecutar(this.http.post<T>(environment.apiUrl + ruta, cuerpo ?? {}));
  }

  put<T>(ruta: string, cuerpo: unknown): Promise<T> {
    return this.ejecutar(this.http.put<T>(environment.apiUrl + ruta, cuerpo));
  }

  patch<T>(ruta: string, cuerpo: unknown): Promise<T> {
    return this.ejecutar(this.http.patch<T>(environment.apiUrl + ruta, cuerpo));
  }

  delete(ruta: string): Promise<void> {
    return this.ejecutar(this.http.delete<void>(environment.apiUrl + ruta));
  }

  private async ejecutar<T>(peticion: Observable<T>): Promise<T> {
    try {
      // Evita que una pantalla quede cargando indefinidamente si el backend no responde.
      return await firstValueFrom(peticion.pipe(timeout({ each: TIEMPO_MAXIMO_MS })));
    } catch (error) {
      throw this.traducir(error);
    }
  }

  private traducir(error: unknown): ApiError {
    if (error instanceof TimeoutError) {
      return new ApiError(408, 'El servidor tardó demasiado en responder. Inténtalo nuevamente.');
    }
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return new ApiError(
          0,
          'No se pudo conectar con el servidor. Revisa que el backend esté encendido.',
        );
      }
      const detalle = error.error?.detail;
      if (typeof detalle === 'string' && detalle.trim()) {
        return new ApiError(error.status, detalle);
      }
      return new ApiError(error.status, this.mensajePorCodigo(error.status));
    }
    return new ApiError(500, 'Ocurrió un error inesperado.');
  }

  private mensajePorCodigo(status: number): string {
    if (status === 401) return 'Tu sesión venció. Vuelve a iniciar sesión.';
    if (status === 403) return 'No tienes permisos para realizar esta acción.';
    if (status === 404) return 'No encontramos la información solicitada.';
    if (status === 429) return 'Hiciste demasiadas solicitudes. Espera un momento.';
    if (status >= 500) return 'El servidor tuvo un problema. Inténtalo nuevamente.';
    return 'Ocurrió un error inesperado.';
  }

  /** HttpClient no acepta undefined/null en los parámetros. */
  private limpiar(parametros?: Parametros): Record<string, string | number> {
    const limpio: Record<string, string | number> = {};
    for (const [clave, valor] of Object.entries(parametros ?? {})) {
      if (valor !== undefined && valor !== null) limpio[clave] = valor;
    }
    return limpio;
  }
}
