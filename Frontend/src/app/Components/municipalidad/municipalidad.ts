import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';

import { Accion, EstadoAccion } from '../../Interfaces/accion.interface';
import { ESTADOS_ACCION, ETIQUETA_NIVEL, ETIQUETA_TIPO } from '../../Interfaces/constantes';
import { PanelMunicipal } from '../../Interfaces/panel.interface';
import { AccionesService } from '../../Services/acciones.service';
import { mensajeDeError } from '../../Services/api.service';
import { NotificacionesService } from '../../Services/notificaciones.service';
import { PanelesService } from '../../Services/paneles.service';
import { UsuariosService } from '../../Services/usuarios.service';
import { AccionFormulario } from '../accion-formulario/accion-formulario';
import { Cargando } from '../cargando/cargando';
import { ErrorCarga } from '../error-carga/error-carga';
import { Estadisticas } from '../estadisticas/estadisticas';
import { Modal } from '../modal/modal';
import { ReporteDetalle } from '../reporte-detalle/reporte-detalle';

type Pestana = 'criticos' | 'acciones' | 'vecinos' | 'reportes' | 'estadisticas';

/** Pantalla del actor Municipalidad: detecta barrios críticos y gestiona su respuesta. */
@Component({
  selector: 'app-municipalidad',
  imports: [DatePipe, AccionFormulario, Estadisticas, Modal, ReporteDetalle, Cargando, ErrorCarga],
  templateUrl: './municipalidad.html',
})
export class Municipalidad implements OnInit {
  private readonly paneles = inject(PanelesService);
  private readonly acciones = inject(AccionesService);
  private readonly usuarios = inject(UsuariosService);
  private readonly avisos = inject(NotificacionesService);

  protected readonly panel = signal<PanelMunicipal | null>(null);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal('');
  protected readonly pestana = signal<Pestana>('criticos');
  protected readonly barrioElegido = signal('');
  protected readonly editando = signal<Accion | null>(null);
  protected readonly reporteId = signal<string | null>(null);

  protected readonly estados = ESTADOS_ACCION;
  protected readonly etiquetaNivel = ETIQUETA_NIVEL;
  protected readonly etiquetaTipo = ETIQUETA_TIPO;
  protected readonly pestanas: { id: Pestana; texto: string }[] = [
    { id: 'criticos', texto: 'Barrios críticos' },
    { id: 'acciones', texto: 'Acciones' },
    { id: 'vecinos', texto: 'Vecinos por verificar' },
    { id: 'reportes', texto: 'Reportes' },
    { id: 'estadisticas', texto: 'Estadísticas' },
  ];

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  protected async cargar(mostrarCarga = true): Promise<void> {
    if (mostrarCarga) this.cargando.set(true);
    this.errorCarga.set('');
    try {
      this.panel.set(await this.paneles.panelMunicipal());
    } catch (error) {
      this.errorCarga.set(mensajeDeError(error));
    } finally {
      if (mostrarCarga) this.cargando.set(false);
    }
  }

  protected nombreBarrio(id: string): string {
    return this.panel()?.zonas.find((z) => z.id === id)?.nombre ?? id;
  }

  protected responder(idBarrio: string): void {
    this.barrioElegido.set(idBarrio);
    this.pestana.set('acciones');
  }

  protected async accionGuardada(): Promise<void> {
    this.editando.set(null);
    await this.cargar(false);
  }

  protected async cambiarEstado(accion: Accion, evento: Event): Promise<void> {
    const select = evento.target as HTMLSelectElement;
    try {
      await this.acciones.cambiarEstado(accion.id, select.value as EstadoAccion);
      this.avisos.exito('Estado actualizado.');
    } catch (error) {
      select.value = accion.estado; // se deshace el cambio visual
      await this.avisos.error(error); // 400: una acción completada no puede reabrirse
    }
    await this.cargar(false);
  }

  protected async eliminarAccion(accion: Accion): Promise<void> {
    if (!(await this.avisos.confirmar('¿Eliminar esta acción?', accion.titulo, 'Eliminar', true))) return;
    try {
      await this.acciones.eliminar(accion.id);
      this.avisos.exito('Acción eliminada.');
      await this.cargar(false);
    } catch (error) {
      await this.avisos.error(error);
    }
  }

  protected async verificar(id: string, decision: 'aprobar' | 'rechazar'): Promise<void> {
    const ok = await this.avisos.confirmar(
      decision === 'aprobar' ? '¿Aprobar a este vecino?' : '¿Rechazar a este vecino?',
      'El vecino verá el resultado al revisar su cuenta.',
      decision === 'aprobar' ? 'Aprobar' : 'Rechazar',
      decision === 'rechazar',
    );
    if (!ok) return;
    try {
      await this.usuarios.verificar(id, decision);
      this.avisos.exito(decision === 'aprobar' ? 'Vecino aprobado.' : 'Vecino rechazado.');
      await this.cargar(false);
    } catch (error) {
      await this.avisos.error(error);
    }
  }
}
