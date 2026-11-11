import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../Services/auth.service';
import { NotificacionesService } from '../../Services/notificaciones.service';

/** Pantalla para quien se registró pero la Municipalidad todavía no lo verifica (o lo rechazó). */
@Component({
  selector: 'app-cuenta-pendiente',
  templateUrl: './cuenta-pendiente.html',
  styleUrl: './cuenta-pendiente.css',
})
export class CuentaPendiente {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly avisos = inject(NotificacionesService);
  protected readonly cargando = signal(false);

  protected async revisar(): Promise<void> {
    this.cargando.set(true);
    try {
      const usuario = await this.auth.refrescar();
      if (usuario.estado === 'Verificado') {
        this.avisos.exito('¡Tu cuenta fue verificada!');
        await this.router.navigateByUrl(this.auth.rutaInicial(usuario));
      } else if (usuario.estado === 'Pendiente') {
        await this.avisos.aviso('Todavía en revisión', 'La Municipalidad aún no revisa tu solicitud.');
      }
    } catch (error) {
      await this.avisos.error(error);
    } finally {
      this.cargando.set(false);
    }
  }

  protected salir(): void {
    void this.auth.cerrarSesion();
  }
}
