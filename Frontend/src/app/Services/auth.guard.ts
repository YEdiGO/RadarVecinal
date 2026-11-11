import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { Rol } from '../Interfaces/usuario.interface';
import { AuthService } from './auth.service';

/** Solo entra quien tenga sesión y cuenta verificada. */
export const sesionGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const usuario = auth.usuario();
  if (!usuario) return router.createUrlTree(['/login']);
  if (usuario.estado !== 'Verificado') return router.createUrlTree(['/cuenta']);
  return true;
};

/** Solo entra el actor indicado (vecino o municipalidad); el otro vuelve a su pantalla. */
export const rolGuard =
  (rol: Rol): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const usuario = auth.usuario();
    if (usuario?.rol === rol) return true;
    return router.createUrlTree([usuario ? auth.rutaInicial(usuario) : '/login']);
  };

/** Pantallas públicas (login/registro): si ya hay sesión, redirige a la pantalla del actor. */
export const publicoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const usuario = auth.usuario();
  return usuario ? router.createUrlTree([auth.rutaInicial(usuario)]) : true;
};

/** La pantalla "Estado de la cuenta" es para quien tiene sesión pero aún no está verificado. */
export const cuentaPendienteGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const usuario = auth.usuario();
  if (!usuario) return router.createUrlTree(['/login']);
  if (usuario.estado === 'Verificado') return router.createUrlTree([auth.rutaInicial(usuario)]);
  return true;
};
