import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { INICIO_POR_ROL } from '../Interfaces/constantes';
import { LoginDatos, RegistroDatos, Usuario } from '../Interfaces/usuario.interface';
import { ApiService } from './api.service';

const CLAVE_SESION = 'radar-sesion';

/** Guarda quién inició sesión. La sesión vive en sessionStorage (se borra al cerrar la pestaña). */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly usuario = signal<Usuario | null>(this.leerSesion());
  /** true cuando el backend rechazó la sesión y hay que volver a entrar. */
  readonly sesionExpirada = signal(false);
  readonly esVecino = computed(() => this.usuario()?.rol === 'vecino');
  readonly esMunicipalidad = computed(() => this.usuario()?.rol === 'municipalidad');
  readonly verificado = computed(() => this.usuario()?.estado === 'Verificado');

  async login(datos: LoginDatos): Promise<Usuario> {
    const usuario = await this.api.post<Usuario>('/auth/login', datos);
    this.guardar(usuario);
    return usuario;
  }

  async registrar(datos: RegistroDatos): Promise<Usuario> {
    const usuario = await this.api.post<Usuario>('/auth/registro', datos);
    this.guardar(usuario);
    return usuario;
  }

  /** Vuelve a pedir los datos al backend (por ejemplo, para ver si ya te verificaron). */
  async refrescar(): Promise<Usuario> {
    const usuario = await this.api.get<Usuario>('/auth/yo');
    this.guardar(usuario);
    return usuario;
  }

  salir(): void {
    this.guardar(null);
  }

  /** Cierra la sesión porque el backend respondió 401; el login muestra el aviso. */
  expirarSesion(): void {
    this.guardar(null);
    this.sesionExpirada.set(true);
  }

  async cerrarSesion(): Promise<void> {
    this.salir();
    await this.router.navigate(['/login'], { replaceUrl: true });
  }

  /** Ruta inicial según el actor (Vecino o Municipalidad) y su estado de verificación. */
  rutaInicial(usuario: Usuario): string {
    return usuario.estado === 'Verificado' ? INICIO_POR_ROL[usuario.rol] : '/cuenta';
  }

  private guardar(usuario: Usuario | null): void {
    this.usuario.set(usuario);
    if (usuario) this.sesionExpirada.set(false);
    try {
      if (usuario) sessionStorage.setItem(CLAVE_SESION, JSON.stringify(usuario));
      else sessionStorage.removeItem(CLAVE_SESION);
    } catch {
      /* sessionStorage no disponible (por ejemplo en el servidor): se ignora */
    }
  }

  private leerSesion(): Usuario | null {
    try {
      const crudo = sessionStorage.getItem(CLAVE_SESION);
      return crudo ? (JSON.parse(crudo) as Usuario) : null;
    } catch {
      return null;
    }
  }
}
