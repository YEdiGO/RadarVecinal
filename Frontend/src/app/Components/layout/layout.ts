import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../Services/auth.service';
import { PanelesService } from '../../Services/paneles.service';

interface Enlace {
  ruta: string;
  texto: string;
  icono: string;
  exacta?: boolean;
}

// Menú de cada actor: solo se muestran las pantallas que le corresponden.
const MENU_VECINO: Enlace[] = [
  { ruta: '/', texto: 'Mapa', icono: 'bi-map', exacta: true },
  { ruta: '/mi-barrio', texto: 'Mi barrio', icono: 'bi-house-heart' },
  { ruta: '/reportes', texto: 'Mis reportes', icono: 'bi-card-checklist' },
  { ruta: '/iniciativas', texto: 'Iniciativas', icono: 'bi-megaphone' },
  { ruta: '/acerca-de', texto: 'Acerca de', icono: 'bi-info-circle' },
];

const MENU_MUNICIPALIDAD: Enlace[] = [
  { ruta: '/', texto: 'Mapa', icono: 'bi-map', exacta: true },
  { ruta: '/municipalidad', texto: 'Municipalidad', icono: 'bi-building' },
  { ruta: '/acerca-de', texto: 'Acerca de', icono: 'bi-info-circle' },
];

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  protected readonly auth = inject(AuthService);
  protected readonly paneles = inject(PanelesService);
  private readonly router = inject(Router);

  protected readonly menu = computed(() => (this.auth.esMunicipalidad() ? MENU_MUNICIPALIDAD : MENU_VECINO));
  protected readonly inicial = computed(() => {
    const nombre = this.auth.usuario()?.nombre?.trim() ?? '';
    return nombre ? nombre.charAt(0).toUpperCase() : '?';
  });

  constructor() {
    // En cada cambio de pantalla, el vecino revisa si hay noticias oficiales sin leer.
    this.router.events
      .pipe(
        filter((evento) => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (this.auth.esVecino()) void this.paneles.refrescarNoticias();
      });
  }

  protected salir(): void {
    void this.auth.cerrarSesion();
  }
}
