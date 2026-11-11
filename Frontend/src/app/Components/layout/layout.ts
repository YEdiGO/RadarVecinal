import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../Services/auth.service';
import { NotificacionesService } from '../../Services/notificaciones.service';
import { PanelesService } from '../../Services/paneles.service';

interface Enlace {
  ruta: string;
  texto: string;
  icono: string;
  exacta?: boolean;
  grupo: string;
}

// Menú de cada actor: solo se muestran las pantallas que le corresponden.
const MENU_VECINO: Enlace[] = [
  { ruta: '/', texto: 'Mapa', icono: 'bi-map', exacta: true, grupo: 'Seguridad' },
  { ruta: '/mi-barrio', texto: 'Mi barrio', icono: 'bi-house-heart', grupo: 'Seguridad' },
  { ruta: '/reportes', texto: 'Mis reportes', icono: 'bi-card-checklist', grupo: 'Participación' },
  { ruta: '/iniciativas', texto: 'Iniciativas', icono: 'bi-megaphone', grupo: 'Participación' },
  { ruta: '/acerca-de', texto: 'Acerca de', icono: 'bi-info-circle', grupo: 'Información' },
];

const MENU_MUNICIPALIDAD: Enlace[] = [
  { ruta: '/', texto: 'Mapa', icono: 'bi-map', exacta: true, grupo: 'Gestión' },
  { ruta: '/municipalidad', texto: 'Municipalidad', icono: 'bi-building', grupo: 'Gestión' },
  { ruta: '/acerca-de', texto: 'Acerca de', icono: 'bi-info-circle', grupo: 'Información' },
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
  private readonly avisos = inject(NotificacionesService);

  protected readonly menu = computed(() =>
    this.auth.esMunicipalidad() ? MENU_MUNICIPALIDAD : MENU_VECINO,
  );
  protected readonly grupos = computed(() => {
    const grupos: { nombre: string; enlaces: Enlace[] }[] = [];
    for (const enlace of this.menu()) {
      let grupo = grupos.find((g) => g.nombre === enlace.grupo);
      if (!grupo) {
        grupo = { nombre: enlace.grupo, enlaces: [] };
        grupos.push(grupo);
      }
      grupo.enlaces.push(enlace);
    }
    return grupos;
  });
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

  protected async salir(): Promise<void> {
    const ok = await this.avisos.confirmar(
      '¿Cerrar sesión?',
      'Vas a salir de Radar Vecinal en este navegador.',
      'Cerrar sesión',
      true,
    );
    if (ok) await this.auth.cerrarSesion();
  }
}
