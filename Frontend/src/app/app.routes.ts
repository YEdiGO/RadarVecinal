import { Routes } from '@angular/router';

import { Layout } from './Components/layout/layout';
import { cuentaPendienteGuard, publicoGuard, rolGuard, sesionGuard } from './Services/auth.guard';

// loadComponent = carga perezosa: cada pantalla se descarga solo cuando se visita.
export const routes: Routes = [
  { path: 'login', canActivate: [publicoGuard], loadComponent: () => import('./Components/login/login').then((m) => m.Login) },
  { path: 'registro', canActivate: [publicoGuard], loadComponent: () => import('./Components/registro/registro').then((m) => m.Registro) },
  { path: 'cuenta', canActivate: [cuentaPendienteGuard], loadComponent: () => import('./Components/cuenta-pendiente/cuenta-pendiente').then((m) => m.CuentaPendiente) },
  {
    path: '',
    component: Layout,
    canActivate: [sesionGuard],
    children: [
      // Pantallas de los dos actores
      { path: '', loadComponent: () => import('./Components/mapa/mapa').then((m) => m.Mapa) },
      { path: 'acerca-de', loadComponent: () => import('./Components/acerca-de/acerca-de').then((m) => m.AcercaDe) },
      // Solo Vecino
      { path: 'mi-barrio', canActivate: [rolGuard('vecino')], loadComponent: () => import('./Components/mi-barrio/mi-barrio').then((m) => m.MiBarrio) },
      { path: 'reportes', canActivate: [rolGuard('vecino')], loadComponent: () => import('./Components/mis-reportes/mis-reportes').then((m) => m.MisReportes) },
      { path: 'iniciativas', canActivate: [rolGuard('vecino')], loadComponent: () => import('./Components/iniciativas/iniciativas').then((m) => m.Iniciativas) },
      { path: 'iniciativas/:id', canActivate: [rolGuard('vecino')], loadComponent: () => import('./Components/iniciativa-detalle/iniciativa-detalle').then((m) => m.IniciativaDetalle) },
      // Solo Municipalidad
      { path: 'municipalidad', canActivate: [rolGuard('municipalidad')], loadComponent: () => import('./Components/municipalidad/municipalidad').then((m) => m.Municipalidad) },
    ],
  },
  { path: '**', redirectTo: '' },
];
