import { Component, ElementRef, OnInit, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';

import { Accion } from '../../Interfaces/accion.interface';
import {
  ETIQUETA_NIVEL,
  ETIQUETA_TIPO,
  NIVELES,
  TIPOS_INCIDENTE,
} from '../../Interfaces/constantes';
import { Alerta } from '../../Interfaces/panel.interface';
import { ReportePublico, TipoIncidente } from '../../Interfaces/reporte.interface';
import { FiltrosMapa, ZonaResumen } from '../../Interfaces/zona.interface';
import { AccionesService } from '../../Services/acciones.service';
import { mensajeDeError } from '../../Services/api.service';
import { AuthService } from '../../Services/auth.service';
import { NotificacionesService } from '../../Services/notificaciones.service';
import { PanelesService } from '../../Services/paneles.service';
import { ReportesService } from '../../Services/reportes.service';
import { ZonasService } from '../../Services/zonas.service';
import { AccionFormulario } from '../accion-formulario/accion-formulario';
import { AccionNoticia } from '../accion-noticia/accion-noticia';
import { AlertaBoton } from '../alerta-boton/alerta-boton';
import { BaseMapa, MapaCalor, Punto } from '../mapa-calor/mapa-calor';
import { Modal } from '../modal/modal';
import { ReporteDetalle } from '../reporte-detalle/reporte-detalle';
import { ReporteFormulario } from '../reporte-formulario/reporte-formulario';

/** Pantalla principal de ambos actores: mapa de calor con filtros. Solo el Vecino puede reportar. */
@Component({
  selector: 'app-mapa',
  imports: [
    FormField,
    MapaCalor,
    ReporteFormulario,
    ReporteDetalle,
    AlertaBoton,
    Modal,
    AccionNoticia,
    AccionFormulario,
  ],
  templateUrl: './mapa.html',
  styleUrl: './mapa.css',
})
export class Mapa implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly zonasService = inject(ZonasService);
  private readonly reportesService = inject(ReportesService);
  private readonly accionesService = inject(AccionesService);
  private readonly paneles = inject(PanelesService);
  private readonly avisos = inject(NotificacionesService);

  private readonly mapaCalor = viewChild(MapaCalor);
  private readonly pantalla = viewChild<ElementRef<HTMLDivElement>>('pantalla');

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
  protected readonly reporteRespondido = signal<ReportePublico | null>(null);

  // Controles del mapa (estilo Google Maps).
  protected readonly base = signal<BaseMapa>('mapa');
  protected readonly busqueda = signal('');
  protected readonly ubicando = signal(false);
  protected readonly pantallaCompleta = signal(false);

  // Filtros del mapa también como Signal Form (los selects son strings).
  protected readonly filtros = signal({ tipo: 'todos', dias: '30' });
  protected readonly formFiltros = form(this.filtros);

  protected readonly tipos = TIPOS_INCIDENTE;
  protected readonly etiquetaTipo = ETIQUETA_TIPO;
  protected readonly etiquetaNivel = ETIQUETA_NIVEL;
  protected readonly niveles = NIVELES;

  /** Resultados del buscador de barrios. */
  protected readonly zonasBuscadas = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    if (!texto) return [];
    return this.zonas()
      .filter((z) => z.nombre.toLowerCase().includes(texto))
      .slice(0, 6);
  });

  /** Resumen rápido que se muestra sobre el mapa. */
  protected readonly zonasAlerta = computed(
    () => this.zonas().filter((z) => z.nivel === 'naranja' || z.nivel === 'rojo').length,
  );
  protected readonly accionesActivas = computed(
    () => this.acciones().filter((a) => a.estado !== 'Completada').length,
  );
  protected readonly ultimos = computed(() =>
    [...this.reportes()].sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha)).slice(0, 5),
  );

  constructor() {
    // Cada vez que cambia un filtro se vuelve a pedir la información al backend.
    effect(() => {
      const f = {
        tipo: this.filtros().tipo as TipoIncidente | 'todos',
        dias: Number(this.filtros().dias),
      };
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

  protected restablecerFiltros(): void {
    this.filtros.set({ tipo: 'todos', dias: '30' });
    this.avisos.exito('Filtros restablecidos.');
  }

  // --- Buscador y controles del mapa ---

  /** Selecciona un barrio desde el buscador y vuela hasta él. */
  protected elegirZona(zona: ZonaResumen): void {
    this.zonaId.set(zona.id);
    this.busqueda.set('');
    this.mapaCalor()?.centrarBarrio(zona);
  }

  protected buscarPrimera(): void {
    const [primera] = this.zonasBuscadas();
    if (primera) this.elegirZona(primera);
  }

  protected escribirBusqueda(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  protected cambiarBase(base: BaseMapa): void {
    this.base.set(base);
    this.mapaCalor()?.cambiarBase(base);
  }

  protected acercar(): void {
    this.mapaCalor()?.acercar();
  }

  protected alejar(): void {
    this.mapaCalor()?.alejar();
  }

  protected verCiudad(): void {
    this.zonaId.set(null);
    this.mapaCalor()?.verCiudad(this.zonas());
  }

  protected async ubicarme(): Promise<void> {
    if (this.ubicando()) return;
    this.ubicando.set(true);
    try {
      const punto = await this.mapaCalor()!.miUbicacion();
      this.avisos.exito(
        `Ubicación encontrada (${punto.lat.toFixed(4)}, ${punto.lng.toFixed(4)}).`,
      );
    } catch (error) {
      await this.avisos.aviso(
        'No pudimos ubicarte',
        error instanceof Error ? error.message : 'Revisa los permisos del navegador.',
      );
    } finally {
      this.ubicando.set(false);
    }
  }

  protected async alternarPantallaCompleta(): Promise<void> {
    if (typeof document === 'undefined') return;
    const elemento = this.pantalla()?.nativeElement;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        this.pantallaCompleta.set(false);
      } else if (elemento?.requestFullscreen) {
        await elemento.requestFullscreen();
        this.pantallaCompleta.set(true);
      }
    } catch {
      await this.avisos.aviso(
        'Pantalla completa no disponible',
        'Tu navegador bloqueó el modo de pantalla completa.',
      );
    }
  }

  protected responderReporte(id: string): void {
    const reporte = this.reportes().find((r) => r.id === id);
    this.reporteId.set(null);
    if (reporte) this.reporteRespondido.set(reporte);
  }

  protected async respuestaGuardada(): Promise<void> {
    this.reporteRespondido.set(null);
    this.avisos.exito('Respuesta publicada: el vecino la verá en su reporte.');
    await this.cargar();
  }

  /** Ancho de la barra de temperatura (45 se toma como referencia visual). */
  protected anchoTemperatura(temperatura: number): number {
    return Math.min(100, Math.max(5, (temperatura / 45) * 100));
  }

  protected anchoTipo(cantidad: number, zona: ZonaResumen): number {
    const maximo = Math.max(1, ...zona.tipos_frecuentes.map((t) => t.cantidad));
    return (cantidad / maximo) * 100;
  }

  protected hace(fecha: string): string {
    const minutos = Math.max(0, Math.round((Date.now() - Date.parse(fecha)) / 60_000));
    if (minutos < 1) return 'ahora';
    if (minutos < 60) return `hace ${minutos} min`;
    const horas = Math.round(minutos / 60);
    if (horas < 24) return `hace ${horas} h`;
    return `hace ${Math.round(horas / 24)} d`;
  }

  protected nivelGravedad(gravedad: number): string {
    if (gravedad >= 5) return 'rojo';
    if (gravedad >= 3) return 'naranja';
    if (gravedad >= 2) return 'amarillo';
    return 'verde';
  }
}
