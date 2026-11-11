import { Injectable, inject, signal } from '@angular/core';

import { Alerta, MiBarrio, PanelMunicipal } from '../Interfaces/panel.interface';
import { ApiService } from './api.service';

/** Pantallas "Municipalidad" y "Mi barrio", más las alertas de 30 minutos. */
@Injectable({ providedIn: 'root' })
export class PanelesService {
  private readonly api = inject(ApiService);

  /** true cuando hay noticias oficiales sin leer (punto rojo en "Mi barrio"). */
  readonly hayNoticiasNuevas = signal(false);

  panelMunicipal(): Promise<PanelMunicipal> {
    return this.api.get('/municipal/panel');
  }

  miBarrio(): Promise<MiBarrio> {
    return this.api.get('/mi-barrio');
  }

  async refrescarNoticias(): Promise<void> {
    try {
      const respuesta = await this.api.get<{ nuevas: boolean }>('/mi-barrio/noticias-nuevas');
      this.hayNoticiasNuevas.set(respuesta.nuevas);
    } catch {
      this.hayNoticiasNuevas.set(false); // no es crítico: simplemente no se muestra el punto
    }
  }

  async marcarLeidas(ids: string[]): Promise<void> {
    await this.api.post('/mi-barrio/noticias-leidas', { ids });
    this.hayNoticiasNuevas.set(false);
  }

  alertas(): Promise<Alerta[]> {
    return this.api.get('/alertas');
  }

  activarAlerta(): Promise<Alerta> {
    return this.api.post('/alertas');
  }
}
