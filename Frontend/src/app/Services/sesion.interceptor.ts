import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';

/** Evita que varias peticiones simultáneas redirijan varias veces al login. */
let redirigiendoAlLogin = false;

/**
 * Se ejecuta en CADA petición HTTP:
 *  1. Agrega el encabezado X-Usuario-Id para que el backend sepa quién eres.
 *  2. Si el backend responde 401 teniendo sesión (sesión vencida), te devuelve al login.
 */
export const sesionInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const usuario = auth.usuario();

  const conSesion = usuario
    ? peticion.clone({ setHeaders: { 'X-Usuario-Id': usuario.id } })
    : peticion;

  return siguiente(conSesion).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401 && usuario) {
        auth.expirarSesion();
        if (!redirigiendoAlLogin) {
          redirigiendoAlLogin = true;
          void router
            .navigate(['/login'], { replaceUrl: true })
            .finally(() => (redirigiendoAlLogin = false));
        }
      }
      return throwError(() => error);
    }),
  );
};
