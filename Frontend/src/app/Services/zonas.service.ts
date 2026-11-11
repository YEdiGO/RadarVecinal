import { Injectable, inject } from '@angular/core';

import { Barrio } from '../Interfaces/barrio.interface';
import { FiltrosMapa, ZonaResumen } from '../Interfaces/zona.interface';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ZonasService {
  private readonly api = inject(ApiService);

  barrios(): Promise<Barrio[]> {
    return this.api.get('/barrios');
  }

  /** Resumen por barrio (temperatura, color, tipos frecuentes) para el mapa de calor. */
  zonas(filtros?: FiltrosMapa): Promise<ZonaResumen[]> {
    return this.api.get('/zonas', { tipo: filtros?.tipo, dias: filtros?.dias });
  }
}
