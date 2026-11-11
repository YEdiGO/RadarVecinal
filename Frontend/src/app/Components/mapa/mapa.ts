import { Component, OnInit, effect, inject, signal, untracked } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';

import { Accion } from '../../Interfaces/accion.interface';
import { ETIQUETA_NIVEL, ETIQUETA_TIPO, NIVELES, TIPOS_INCIDENTE } from '../../Interfaces/constantes';
import { Alerta } from '../../Interfaces/panel.interface';
import { ReportePublico, TipoIncidente } from '../../Interfaces/reporte.interface';
import { FiltrosMapa, ZonaResumen } from '../../Interfaces/zona.interface';
import { AccionesService } from '../../Services/acciones.service';
import { mensajeDeError } from '../../Services/api.service';
import { AuthService } from '../../Services/auth.service';
import { PanelesService } from '../../Services/paneles.service';
import { ReportesService } from '../../Services/reportes.service';
import { ZonasService } from '../../Services/zonas.service';
import { AccionNoticia } from '../accion-noticia/accion-noticia';
import { AlertaBoton } from '../alerta-boton/alerta-boton';
import { MapaCalor, Punto } from '../mapa-calor/mapa-calor';
import { Modal } from '../modal/modal';
import { ReporteDetalle } from '../reporte-detalle/reporte-detalle';
import { ReporteFormulario } from '../reporte-formulario/reporte-formulario';

/** Pantalla principal de ambos actores: mapa de calor con filtros. Solo el Vecino puede reportar. */
@Component({
  selector: 'app-mapa',
  imports: [FormField, MapaCalor, ReporteFormulario, ReporteDetalle, AlertaBoton, Modal, AccionNoticia],
  templateUrl: './mapa.html',
  styleUrl: './mapa.css',
})
export class Mapa implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly zonasService = inject(ZonasService);
  private readonly reportesService = inject(ReportesService);
  private readonly accionesService = inject(AccionesService);
  private readonly paneles = inject(PanelesService);

  protected readonly zonas = signal<ZonaResumen[]>([]);
  protected readonly reportes = signal<ReportePublico[]>([]);
  protected readonly acciones = signal<Accion[]>([]);
  protected readonly alertas = signal<Alerta[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal('');
  private numeroSolicitud = 0;

  protected readonly zonaId = signal<string | null>(null);
  protected readonly reportando = signal(false);
  protected readonly punto = signal<Punto | null>(null);
  protected readonly reporteId = signal<string | null>(null);
  protected readonly accionVista = signal<Accion | null>(null);

  // Filtros del mapa también como Signal Form (los selects son strings).
  protected readonly filtros = signal({ tipo: 'todos', dias: '30' });
  protected readonly formFiltros = form(this.filtros);

  protected readonly tipos = TIPOS_INCIDENTE;
  protected readonly etiquetaTipo = ETIQUETA_TIPO;
  protected readonly etiquetaNivel = ETIQUETA_NIVEL;
  protected readonly niveles = NIVELES;

  constructor() {
    // Cada vez que cambia un filtro se vuelve a pedir la información al backend.
    effect(() => {
      const f = { tipo: this.filtros().tipo as TipoIncidente | 'todos', dias: Number(this.filtros().dias) };
      untracked(() => void this.cargar(f));
    });
  }

  async ngOnInit(): Promise<void> {
    await this.cargarAlertas();
  }

  protected zonaSeleccionada(): ZonaResumen | undefined {
    return this.zonas().find((z) => z.id === this.zonaId());
  }

  protected accionesDe(idBarrio: string): Accion[] {
    return this.acciones().filter((a) => a.id_barrio === idBarrio);
  }

  protected async cargar(f?: FiltrosMapa): Promise<void> {
    const filtros = f ?? {
      tipo: this.filtros().tipo as TipoIncidente | 'todos',
      dias: Number(this.filtros().dias),
    };
    const solicitud = ++this.numeroSolicitud;
    this.cargando.set(true);
    this.errorCarga.set('');
    try {
      const [zonas, reportes, acciones] = await Promise.all([
        this.zonasService.zonas(filtros),
        this.reportesService.listar(filtros),
        this.accionesService.listar(),
      ]);
      // Si el usuario cambió los filtros mientras cargaba, se ignora la respuesta vieja.
      if (solicitud !== this.numeroSolicitud) return;
      this.zonas.set(zonas);
      this.reportes.set(reportes);
      this.acciones.set(acciones);
    } catch (error) {
      if (solicitud === this.numeroSolicitud) this.errorCarga.set(mensajeDeError(error));
    } finally {
      if (solicitud === this.numeroSolicitud) this.cargando.set(false);
    }
  }

  protected async cargarAlertas(): Promise<void> {
    try {
      this.alertas.set(await this.paneles.alertas());
    } catch {
      this.alertas.set([]);
    }
  }

  protected iniciarReporte(): void {
    this.zonaId.set(null);
    this.punto.set(null);
    this.reportando.set(true);
  }

  protected async reporteGuardado(): Promise<void> {
    this.reportando.set(false);
    this.punto.set(null);
    await this.cargar();
  }

  protected verAccion(id: string): void {
    this.accionVista.set(this.acciones().find((a) => a.id === id) ?? null);
  }
}
