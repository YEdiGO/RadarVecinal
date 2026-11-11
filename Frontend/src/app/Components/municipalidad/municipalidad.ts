import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { Accion, EstadoAccion } from '../../Interfaces/accion.interface';
import { ESTADOS_ACCION, ETIQUETA_NIVEL, ETIQUETA_TIPO } from '../../Interfaces/constantes';
import { PanelMunicipal } from '../../Interfaces/panel.interface';
import { ReportePublico } from '../../Interfaces/reporte.interface';
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
  protected readonly reporteRespondido = signal<ReportePublico | null>(null);
  protected readonly cambiandoEstado = signal<string | null>(null);
  protected readonly verificando = signal<string | null>(null);

  protected readonly estados = ESTADOS_ACCION;
  protected readonly etiquetaNivel = ETIQUETA_NIVEL;
  protected readonly etiquetaTipo = ETIQUETA_TIPO;
  protected readonly pestanas: { id: Pestana; texto: string; icono: string }[] = [
    { id: 'criticos', texto: 'Barrios críticos', icono: 'bi-exclamation-triangle' },
    { id: 'acciones', texto: 'Acciones', icono: 'bi-clipboard-check' },
    { id: 'vecinos', texto: 'Vecinos por verificar', icono: 'bi-person-check' },
    { id: 'reportes', texto: 'Reportes', icono: 'bi-card-list' },
    { id: 'estadisticas', texto: 'Estadísticas', icono: 'bi-bar-chart' },
  ];

  protected readonly activas = computed(
    () => (this.panel()?.acciones ?? []).filter((a) => a.estado !== 'Completada').length,
  );
  protected readonly zonasAlerta = computed(
    () =>
      (this.panel()?.zonas ?? []).filter((z) => z.nivel === 'naranja' || z.nivel === 'rojo').length,
  );

  /** Los reportes con denuncias van primero: son los que necesitan revisión urgente. */
  protected readonly reportesOrdenados = computed(() =>
    [...(this.panel()?.reportes ?? [])].sort(
      (a, b) => b.denuncias - a.denuncias || Date.parse(b.fecha) - Date.parse(a.fecha),
    ),
  );

  protected readonly denunciados = computed(
    () => this.reportesOrdenados().filter((r) => r.denuncias > 0).length,
  );

  /** Acción oficial que ya responde a un reporte (si existe). */
  protected respuestaDe(idReporte: string): Accion | undefined {
    return this.panel()?.acciones.find((a) => a.id_reporte === idReporte);
  }

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

  protected anchoTemperatura(temperatura: number): number {
    return Math.min(100, Math.max(4, (temperatura / 45) * 100));
  }

  protected responder(idBarrio: string): void {
    this.barrioElegido.set(idBarrio);
    this.pestana.set('acciones');
  }

  protected async accionGuardada(): Promise<void> {
    this.editando.set(null);
    await this.cargar(false);
  }

  /** Abre el formulario de acción como respuesta oficial a un reporte. */
  protected responderReporte(reporte: ReportePublico): void {
    this.reporteId.set(null);
    this.reporteRespondido.set(reporte);
  }

  protected responderReportePorId(id: string): void {
    const reporte = this.reportesOrdenados().find((r) => r.id === id);
    if (reporte) this.responderReporte(reporte);
  }

  protected async respuestaGuardada(): Promise<void> {
    this.reporteRespondido.set(null);
    this.avisos.exito('Respuesta publicada: el vecino ya puede verla en su reporte.');
    await this.cargar(false);
  }

  protected async cambiarEstado(accion: Accion, evento: Event): Promise<void> {
    const select = evento.target as HTMLSelectElement;
    if (this.cambiandoEstado()) {
      select.value = accion.estado;
      return;
    }
    this.cambiandoEstado.set(accion.id);
    try {
      await this.acciones.cambiarEstado(accion.id, select.value as EstadoAccion);
      this.avisos.exito('Estado actualizado. El vecino verá el cambio en su barrio.');
    } catch (error) {
      select.value = accion.estado; // se deshace el cambio visual
      await this.avisos.error(error); // 400: una acción completada no puede reabrirse
    } finally {
      this.cambiandoEstado.set(null);
    }
    await this.cargar(false);
  }

  protected async eliminarAccion(accion: Accion): Promise<void> {
    if (!(await this.avisos.confirmar('¿Eliminar esta acción?', accion.titulo, 'Eliminar', true)))
      return;
    try {
      await this.acciones.eliminar(accion.id);
      this.avisos.exito('Acción eliminada.');
      await this.cargar(false);
    } catch (error) {
      await this.avisos.error(error);
    }
  }

  protected async verificar(id: string, decision: 'aprobar' | 'rechazar'): Promise<void> {
    if (this.verificando()) return;
    const ok = await this.avisos.confirmar(
      decision === 'aprobar' ? '¿Aprobar a este vecino?' : '¿Rechazar a este vecino?',
      'El vecino verá el resultado al revisar su cuenta.',
      decision === 'aprobar' ? 'Aprobar' : 'Rechazar',
      decision === 'rechazar',
    );
    if (!ok) return;
    this.verificando.set(id);
    try {
      await this.usuarios.verificar(id, decision);
      this.avisos.exito(decision === 'aprobar' ? 'Vecino aprobado.' : 'Vecino rechazado.');
      await this.cargar(false);
    } catch (error) {
      await this.avisos.error(error);
    } finally {
      this.verificando.set(null);
    }
  }
}
