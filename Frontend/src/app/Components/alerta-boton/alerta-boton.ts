import { Component, inject, output } from '@angular/core';

import { NotificacionesService } from '../../Services/notificaciones.service';
import { PanelesService } from '../../Services/paneles.service';

/** Botón "Alerta de barrio": un vecino activa una alerta de 30 minutos en su barrio. */
@Component({
  selector: 'app-alerta-boton',
  template: `<button class="btn btn-danger shadow" (click)="activar()"><i class="bi bi-exclamation-triangle-fill me-1"></i>Alerta de barrio</button>`,
})
export class AlertaBoton {
  private readonly paneles = inject(PanelesService);
  private readonly avisos = inject(NotificacionesService);
  readonly activada = output<void>();

  protected async activar(): Promise<void> {
    const ok = await this.avisos.confirmar('¿Activar alerta en tu barrio?', 'Tu barrio quedará EN ALERTA durante 30 minutos para todos.', 'Activar alerta', true);
    if (!ok) return;
    try {
      await this.paneles.activarAlerta();
      this.avisos.exito('Alerta activada por 30 minutos.');
      this.activada.emit();
    } catch (error) {
      await this.avisos.error(error);
    }
  }
}
