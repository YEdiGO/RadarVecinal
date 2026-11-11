import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ETIQUETA_TIPO } from '../../Interfaces/constantes';
import { Reporte, TipoIncidente } from '../../Interfaces/reporte.interface';
import { mensajeDeError } from '../../Services/api.service';
import { NotificacionesService } from '../../Services/notificaciones.service';
import { ReportesService } from '../../Services/reportes.service';
import { Cargando } from '../cargando/cargando';
import { ErrorCarga } from '../error-carga/error-carga';
import { Modal } from '../modal/modal';
import { ReporteDetalle } from '../reporte-detalle/reporte-detalle';
import { ReporteFormulario } from '../reporte-formulario/reporte-formulario';

type Filtro = 'todos' | 'activo' | 'confirmado';

/** CRUD de los reportes del vecino: ver, editar y eliminar. (Crear se hace desde el mapa.) */
@Component({
  selector: 'app-mis-reportes',
  imports: [DatePipe, RouterLink, Modal, ReporteFormulario, ReporteDetalle, Cargando, ErrorCarga],
  templateUrl: './mis-reportes.html',
})
export class MisReportes implements OnInit {
  private readonly reportesService = inject(ReportesService);
  private readonly avisos = inject(NotificacionesService);

  protected readonly reportes = signal<Reporte[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal('');
  protected readonly editando = signal<Reporte | null>(null);
  protected readonly viendo = signal<string | null>(null);
  protected readonly etiqueta = ETIQUETA_TIPO;
  protected readonly filtro = signal<Filtro>('todos');

  protected readonly resumen = computed(() => {
    const lista = this.reportes();
    return {
      total: lista.length,
      activos: lista.filter((r) => r.estado === 'activo').length,
      confirmados: lista.filter((r) => r.estado === 'confirmado').length,
    };
  });

  protected readonly visibles = computed(() => {
    const filtro = this.filtro();
    return filtro === 'todos'
      ? this.reportes()
      : this.reportes().filter((r) => r.estado === filtro);
  });

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  protected icono(tipo: TipoIncidente): string {
    const iconos: Record<TipoIncidente, string> = {
      asalto_robo: 'bi-shield-exclamation',
      pandillaje: 'bi-people',
      alcohol_drogas: 'bi-cup-hot',
      falta_alumbrado: 'bi-lightbulb',
      actividad_sospechosa: 'bi-eyeglasses',
      otro: 'bi-three-dots',
    };
    return iconos[tipo];
  }

  protected colorEstado(estado: string): string {
    return (
      { activo: 'warning', confirmado: 'success', falso: 'danger', archivado: 'secondary' }[
        estado
      ] ?? 'secondary'
    );
  }

  protected async cargar(mostrarCarga = true): Promise<void> {
    if (mostrarCarga) this.cargando.set(true);
    this.errorCarga.set('');
    try {
      this.reportes.set(await this.reportesService.misReportes());
    } catch (error) {
      this.errorCarga.set(mensajeDeError(error));
    } finally {
      if (mostrarCarga) this.cargando.set(false);
    }
  }

  protected async eliminar(reporte: Reporte): Promise<void> {
    if (
      !(await this.avisos.confirmar(
        '¿Eliminar este reporte?',
        'Esta acción no se puede deshacer.',
        'Eliminar',
        true,
      ))
    )
      return;
    try {
      await this.reportesService.eliminar(reporte.id);
      this.avisos.exito('Reporte eliminado.');
      await this.cargar(false);
    } catch (error) {
      await this.avisos.error(error);
    }
  }

  protected async guardado(): Promise<void> {
    this.editando.set(null);
    await this.cargar(false);
  }
}
