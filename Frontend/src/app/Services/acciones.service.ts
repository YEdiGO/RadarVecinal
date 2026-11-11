import { Injectable, inject } from '@angular/core';

import { Accion, AccionDatos, EstadoAccion } from '../Interfaces/accion.interface';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class AccionesService {
  private readonly api = inject(ApiService);

  listar(idBarrio?: string): Promise<Accion[]> {
    return this.api.get('/acciones', { id_barrio: idBarrio });
  }

  crear(datos: AccionDatos): Promise<Accion> {
    return this.api.post('/acciones', datos);
  }

  actualizar(id: string, datos: AccionDatos): Promise<Accion> {
    return this.api.put(`/acciones/${id}`, datos);
  }

  cambiarEstado(id: string, estado: EstadoAccion): Promise<Accion> {
    return this.api.patch(`/acciones/${id}/estado`, { estado });
  }

  eliminar(id: string): Promise<void> {
    return this.api.delete(`/acciones/${id}`);
  }
}
