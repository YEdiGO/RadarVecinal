import { Injectable, inject } from '@angular/core';

import {
  Iniciativa,
  IniciativaConParticipacion,
  IniciativaDatos,
} from '../Interfaces/iniciativa.interface';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class IniciativasService {
  private readonly api = inject(ApiService);

  listar(idBarrio?: string): Promise<IniciativaConParticipacion[]> {
    return this.api.get('/iniciativas', { id_barrio: idBarrio });
  }

  obtener(id: string): Promise<IniciativaConParticipacion> {
    return this.api.get(`/iniciativas/${id}`);
  }

  crear(datos: IniciativaDatos): Promise<Iniciativa> {
    return this.api.post('/iniciativas', datos);
  }

  actualizar(id: string, datos: IniciativaDatos): Promise<Iniciativa> {
    return this.api.put(`/iniciativas/${id}`, datos);
  }

  eliminar(id: string): Promise<void> {
    return this.api.delete(`/iniciativas/${id}`);
  }

  sumarse(id: string): Promise<Iniciativa> {
    return this.api.post(`/iniciativas/${id}/participantes`);
  }
}
