import { Injectable, inject } from '@angular/core';

import { Usuario } from '../Interfaces/usuario.interface';
import { ApiService } from './api.service';

/** Gestión de cuentas que hace la Municipalidad (verificar y administrar vecinos). */
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly api = inject(ApiService);

  listar(estado?: string): Promise<Usuario[]> {
    return this.api.get('/usuarios', { estado });
  }

  verificar(id: string, decision: 'aprobar' | 'rechazar'): Promise<Usuario> {
    return this.api.patch(`/usuarios/${id}/verificacion`, { decision });
  }

  actualizar(id: string, datos: { nombre: string; id_barrio: string }): Promise<Usuario> {
    return this.api.put(`/usuarios/${id}`, datos);
  }

  eliminar(id: string): Promise<void> {
    return this.api.delete(`/usuarios/${id}`);
  }
}
