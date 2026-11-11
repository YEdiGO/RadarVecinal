import { RenderMode, ServerRoute } from '@angular/ssr';

// El mapa (Leaflet) y la sesión (sessionStorage) solo existen en el navegador,
// por eso todas las rutas se renderizan en el cliente.
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
