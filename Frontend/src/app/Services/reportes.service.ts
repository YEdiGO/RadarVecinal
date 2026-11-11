import { Injectable, inject } from '@angular/core';

import {
  Reporte,
  ReporteDatos,
  ReporteDetalle,
  ReportePublico,
  VotoReporte,
} from '../Interfaces/reporte.interface';
import { FiltrosMapa } from '../Interfaces/zona.interface';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly api = inject(ApiService);

  listar(filtros?: FiltrosMapa): Promise<ReportePublico[]> {
    return this.api.get('/reportes', { tipo: filtros?.tipo, dias: filtros?.dias });
  }

  misReportes(): Promise<Reporte[]> {
    return this.api.get('/reportes/mios');
  }

  detalle(id: string): Promise<ReporteDetalle> {
    return this.api.get(`/reportes/${id}`);
  }

  crear(datos: ReporteDatos): Promise<Reporte> {
    return this.api.post('/reportes', datos);
  }

  actualizar(id: string, datos: ReporteDatos): Promise<Reporte> {
    return this.api.put(`/reportes/${id}`, datos);
  }

  eliminar(id: string): Promise<void> {
    return this.api.delete(`/reportes/${id}`);
  }

  votar(id: string, voto: VotoReporte): Promise<ReportePublico> {
    return this.api.post(`/reportes/${id}/votos`, { voto });
  }

  denunciar(id: string): Promise<unknown> {
    return this.api.post(`/reportes/${id}/denuncias`);
  }

  /** Solo la Municipalidad: marcar como falso o archivar. */
  moderar(id: string, estado: 'falso' | 'archivado'): Promise<ReportePublico> {
    return this.api.patch(`/reportes/${id}/estado`, { estado });
  }
}
