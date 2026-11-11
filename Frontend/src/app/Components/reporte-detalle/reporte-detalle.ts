import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, output, signal } from '@angular/core';

import { ETIQUETA_TIPO } from '../../Interfaces/constantes';
import { ReporteDetalle as Detalle } from '../../Interfaces/reporte.interface';
import { mensajeDeError } from '../../Services/api.service';
import { AuthService } from '../../Services/auth.service';
import { NotificacionesService } from '../../Services/notificaciones.service';
import { ReportesService } from '../../Services/reportes.service';
import { Cargando } from '../cargando/cargando';
import { ErrorCarga } from '../error-carga/error-carga';
import { Modal } from '../modal/modal';

/** Detalle de un reporte: el vecino puede confirmar/denunciar y la Municipalidad moderar. */
@Component({
  selector: 'app-reporte-detalle',
  imports: [Modal, DatePipe, Cargando, ErrorCarga],
  templateUrl: './reporte-detalle.html',
})
export class ReporteDetalle implements OnInit {
  private readonly reportes = inject(ReportesService);
  private readonly avisos = inject(NotificacionesService);
  protected readonly auth = inject(AuthService);

  readonly id = input.required<string>();
  readonly cerrar = output<void>();
  readonly cambiado = output<void>();

  protected readonly detalle = signal<Detalle | null>(null);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal('');
  protected readonly etiqueta = ETIQUETA_TIPO;

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  protected async cargar(mostrarCarga = true): Promise<void> {
    if (mostrarCarga) this.cargando.set(true);
    this.errorCarga.set('');
    try {
      this.detalle.set(await this.reportes.detalle(this.id()));
    } catch (error) {
      this.errorCarga.set(mensajeDeError(error));
    } finally {
      if (mostrarCarga) this.cargando.set(false);
    }
  }

  protected async votar(voto: 'confirmo' | 'incorrecto'): Promise<void> {
    try {
      await this.reportes.votar(this.id(), voto);
      this.avisos.exito('Gracias por tu valoración.');
      await this.cargar(false);
      this.cambiado.emit();
    } catch (error) {
      await this.avisos.error(error); // 409 si ya votaste
    }
  }

  protected async denunciar(): Promise<void> {
    if (!(await this.avisos.confirmar('¿Denunciar este reporte?', 'La Municipalidad lo revisará.', 'Denunciar', true))) return;
    try {
      await this.reportes.denunciar(this.id());
      this.avisos.exito('Denuncia enviada.');
      await this.cargar(false);
    } catch (error) {
      await this.avisos.error(error);
    }
  }

  protected async moderar(estado: 'falso' | 'archivado'): Promise<void> {
    const texto = estado === 'falso' ? 'Se marcará como falso y dejará de sumar temperatura.' : 'Se archivará y desaparecerá del mapa.';
    if (!(await this.avisos.confirmar('¿Moderar este reporte?', texto, 'Sí, continuar', true))) return;
    try {
      await this.reportes.moderar(this.id(), estado);
      this.avisos.exito('Reporte actualizado.');
      this.cambiado.emit();
      this.cerrar.emit();
    } catch (error) {
      await this.avisos.error(error);
    }
  }
}
