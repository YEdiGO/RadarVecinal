import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';

import { routes } from './app.routes';
import { sesionInterceptor } from './Services/sesion.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: el :id de la URL llega como @Input/input() al componente.
    provideRouter(routes, withComponentInputBinding()),
    provideClientHydration(),
    // El interceptor agrega el encabezado X-Usuario-Id a cada petición.
    provideHttpClient(withFetch(), withInterceptors([sesionInterceptor])),
  ],
};
