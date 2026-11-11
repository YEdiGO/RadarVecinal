import { Component, OnInit, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { IniciativaConParticipacion } from '../../Interfaces/iniciativa.interface';
import { ApiError, mensajeDeError } from '../../Services/api.service';
import { IniciativasService } from '../../Services/iniciativas.service';
import { NotificacionesService } from '../../Services/notificaciones.service';
import { Cargando } from '../cargando/cargando';
import { ErrorCarga } from '../error-carga/error-carga';
import { IniciativaFormulario } from '../iniciativa-formulario/iniciativa-formulario';
import { Modal } from '../modal/modal';

@Component({
  selector: 'app-iniciativa-detalle',
  imports: [RouterLink, Modal, IniciativaFormulario, Cargando, ErrorCarga],
  templateUrl: './iniciativa-detalle.html',
})
export class IniciativaDetalle implements OnInit {
  private readonly servicio = inject(IniciativasService);
  private readonly avisos = inject(NotificacionesService);
  private readonly router = inject(Router);

  /** Llega desde la URL (/iniciativas/:id) gracias a withComponentInputBinding(). */
  readonly id = input.required<string>();
  protected readonly iniciativa = signal<IniciativaConParticipacion | null>(null);
  protected readonly editando = signal(false);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal('');

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  protected async cargar(mostrarCarga = true): Promise<void> {
    if (mostrarCarga) this.cargando.set(true);
    this.errorCarga.set('');
    try {
      this.iniciativa.set(await this.servicio.obtener(this.id()));
    } catch (error) {
      // Solo un 404 justifica salir de la pantalla; un fallo de red se puede reintentar.
      if (error instanceof ApiError && error.status === 404) {
        await this.avisos.error(error);
        await this.router.navigate(['/iniciativas']);
        return;
      }
      this.errorCarga.set(mensajeDeError(error));
    } finally {
      if (mostrarCarga) this.cargando.set(false);
    }
  }

  protected async sumarse(): Promise<void> {
    try {
      await this.servicio.sumarse(this.id());
      this.avisos.exito('¡Te sumaste a la iniciativa!');
      await this.cargar(false);
    } catch (error) {
      await this.avisos.error(error);
    }
  }

  protected async eliminar(): Promise<void> {
    if (!(await this.avisos.confirmar('¿Eliminar esta iniciativa?', 'Se borrará para todos los vecinos.', 'Eliminar', true))) return;
    try {
      await this.servicio.eliminar(this.id());
      this.avisos.exito('Iniciativa eliminada.');
      await this.router.navigate(['/iniciativas']);
    } catch (error) {
      await this.avisos.error(error);
    }
  }

  protected async guardado(): Promise<void> {
    this.editando.set(false);
    await this.cargar(false);
  }
}
