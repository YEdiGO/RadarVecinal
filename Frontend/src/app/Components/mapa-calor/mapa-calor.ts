import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type * as Leaflet from 'leaflet';

import { Accion } from '../../Interfaces/accion.interface';
import { CENTRO_HUANCAYO, COLOR_NIVEL } from '../../Interfaces/constantes';
import { Alerta } from '../../Interfaces/panel.interface';
import { ReportePublico } from '../../Interfaces/reporte.interface';
import { ZonaResumen } from '../../Interfaces/zona.interface';

export interface Punto {
  lat: number;
  lng: number;
}

/** Mismo cálculo del backend: gravedad × confirmaciones × 0.5^(días/15). Solo para dibujar el calor. */
function pesoReporte(r: ReportePublico): number {
  const dias = Math.max(0, (Date.now() - new Date(r.fecha).getTime()) / 86_400_000);
  const factor = 1 + (Math.min(Math.max(r.confirmaciones, 0), 3) / 3) * 0.5;
  return r.gravedad * factor * Math.pow(0.5, dias / 15);
}

function mmss(segundos: number): string {
  const m = Math.floor(segundos / 60).toString().padStart(2, '0');
  const s = (segundos % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/**
 * Mapa de Huancayo con Leaflet: barrios coloreados, capa de calor, puntos de reportes,
 * marcadores de respuesta oficial y barrios EN ALERTA. También sirve para elegir un punto.
 * Leaflet solo funciona en el navegador, por eso se carga dentro de afterNextRender.
 */
@Component({
  selector: 'app-mapa-calor',
  template: '<div #contenedor class="mapa"></div>',
  styles: ':host { display: block; height: 100%; } .mapa { height: 100%; width: 100%; min-height: 240px; }',
})
export class MapaCalor implements OnDestroy {
  readonly zonas = input<ZonaResumen[]>([]);
  readonly reportes = input<ReportePublico[]>([]);
  readonly acciones = input<Accion[]>([]);
  readonly alertas = input<Alerta[]>([]);
  readonly seleccion = input<string | null>(null);
  /** true = modo "elegir punto" (formulario de reporte). */
  readonly elegir = input(false);
  readonly punto = input<Punto | null>(null);

  readonly zonaClick = output<string>();
  readonly reporteClick = output<string>();
  readonly accionClick = output<string>();
  readonly puntoElegido = output<Punto>();

  private readonly contenedor = viewChild.required<ElementRef<HTMLDivElement>>('contenedor');
  private readonly listo = signal(false);
  private L!: typeof Leaflet;
  private HeatLayer!: typeof import('leaflet.heat').HeatLayer;
  private mapa?: Leaflet.Map;
  private capas?: Leaflet.LayerGroup;
  private capasAlerta?: Leaflet.LayerGroup;
  private capaCalor?: Leaflet.Layer;
  private temporizador?: ReturnType<typeof setInterval>;
  private readonly ahora = signal(Date.now());

  constructor() {
    afterNextRender(async () => {
      const leaflet = await import('leaflet');
      this.L = (leaflet as unknown as { default: typeof Leaflet }).default ?? leaflet;
      // Capa de calor (plugin leaflet.heat): se guarda su clase para crear la capa luego.
      this.HeatLayer = (await import('leaflet.heat')).HeatLayer;

      this.mapa = this.L.map(this.contenedor().nativeElement, {
        center: [CENTRO_HUANCAYO.lat, CENTRO_HUANCAYO.lng],
        zoom: 14,
        zoomControl: false,
      });
      this.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(this.mapa);
      this.L.control.zoom({ position: 'bottomright' }).addTo(this.mapa);
      this.capas = this.L.layerGroup().addTo(this.mapa);
      this.capasAlerta = this.L.layerGroup().addTo(this.mapa);

      this.mapa.on('click', (e: Leaflet.LeafletMouseEvent) => {
        if (this.elegir()) this.puntoElegido.emit({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      // Cuenta regresiva de las alertas: se actualiza cada segundo.
      this.temporizador = setInterval(() => this.ahora.set(Date.now()), 1000);
      this.listo.set(true);
    });

    // Se vuelve a dibujar cada vez que cambia alguna entrada (zonas, reportes, selección...).
    effect(() => {
      if (!this.listo()) return;
      this.dibujar();
    });
    effect(() => {
      if (!this.listo()) return;
      this.dibujarAlertas();
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.temporizador);
    this.mapa?.remove();
  }

  /**
   * Barrios EN ALERTA: borde rojo parpadeante con cuenta regresiva. Va en su propia capa
   * porque se actualiza cada segundo y no queremos redibujar todo el mapa.
   */
  private dibujarAlertas(): void {
    const L = this.L;
    const capa = this.capasAlerta!;
    const zonas = this.zonas();
    const alertas = this.alertas();
    const ahora = alertas.length ? this.ahora() : 0; // solo se vuelve a ejecutar si hay alertas
    capa.clearLayers();
    if (this.elegir()) return;

    for (const alerta of alertas) {
      const zona = zonas.find((z) => z.id === alerta.id_barrio);
      const segundos = Math.max(0, Math.ceil((Date.parse(alerta.expira) - ahora) / 1000));
      if (!zona || segundos <= 0) continue;
      L.polygon(zona.poligono, {
        color: COLOR_NIVEL.rojo,
        weight: 5,
        fill: false,
        className: 'barrio-en-alerta',
      })
        .bindTooltip(`${zona.nombre} · EN ALERTA ${mmss(segundos)}`, { permanent: true, direction: 'center' })
        .on('click', () => this.zonaClick.emit(zona.id))
        .addTo(capa);
    }
  }

  private dibujar(): void {
    const L = this.L;
    const mapa = this.mapa!;
    const capas = this.capas!;
    const zonas = this.zonas();
    const seleccion = this.seleccion();
    const elegir = this.elegir();
    capas.clearLayers();

    // Barrios coloreados según su temperatura
    for (const zona of zonas) {
      const color = COLOR_NIVEL[zona.nivel];
      const poligono = L.polygon(zona.poligono, {
        color,
        fillColor: color,
        fillOpacity: seleccion === zona.id ? 0.32 : 0.18,
        weight: seleccion === zona.id ? 3 : 1,
      }).addTo(capas);
      if (!elegir) {
        poligono.bindTooltip(`${zona.nombre} · ${zona.cantidad} reportes`, { sticky: true });
        poligono.on('click', () => this.zonaClick.emit(zona.id));
      }
    }

    // Capa de calor (reportes que no son falsos ni archivados)
    if (this.capaCalor) mapa.removeLayer(this.capaCalor);
    const puntosCalor = this.reportes()
      .filter((r) => r.estado !== 'falso' && r.estado !== 'archivado')
      .map((r) => [r.lat, r.lng, pesoReporte(r)] as [number, number, number]);
    this.capaCalor = (new this.HeatLayer(puntosCalor, {
      radius: 32,
      blur: 25,
      max: 8,
      maxZoom: 15,
      minOpacity: 0.12,
      gradient: { 0.2: COLOR_NIVEL.verde, 0.45: COLOR_NIVEL.amarillo, 0.7: COLOR_NIVEL.naranja, 1: COLOR_NIVEL.rojo },
    }) as unknown as Leaflet.Layer).addTo(mapa);

    if (!elegir) {
      // Marcador de "respuesta oficial" en los barrios con una acción en curso o planificada
      for (const zona of zonas) {
        const accion = this.acciones()
          .filter((a) => a.id_barrio === zona.id && a.estado !== 'Completada')
          .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
        const esquina = zona.poligono[0];
        if (!accion || !esquina) continue;
        L.marker(esquina, {
          icon: L.divIcon({
            className: 'marcador-oficial',
            html: '<span title="Respuesta oficial"><i class="bi bi-shield-check"></i></span>',
            iconSize: [30, 30],
          }),
        })
          .bindTooltip(`${accion.titulo} · ${accion.estado}`)
          .on('click', () => this.accionClick.emit(accion.id))
          .addTo(capas);
      }

      // Cada reporte es un puntito clicable
      for (const reporte of this.reportes()) {
        L.circleMarker([reporte.lat, reporte.lng], {
          radius: 4,
          color: COLOR_NIVEL.rojo,
          fillOpacity: 0.8,
          weight: 1,
        })
          .bindTooltip(reporte.descripcion)
          .on('click', (e: Leaflet.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e.originalEvent);
            this.reporteClick.emit(reporte.id);
          })
          .addTo(capas);
      }
    }

    // Punto elegido en el formulario
    const punto = this.punto();
    if (punto) {
      L.circleMarker([punto.lat, punto.lng], {
        radius: 9,
        color: COLOR_NIVEL.rojo,
        fillOpacity: 0.9,
        weight: 3,
      }).addTo(capas);
      mapa.panTo([punto.lat, punto.lng]);
    }
  }
}
