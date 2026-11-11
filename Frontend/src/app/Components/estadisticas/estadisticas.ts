import { Component, computed, input } from '@angular/core';

import { ETIQUETA_TIPO } from '../../Interfaces/constantes';
import { ReportePublico, TipoIncidente } from '../../Interfaces/reporte.interface';
import { PuntoCaliente, ZonaResumen } from '../../Interfaces/zona.interface';

interface Barra {
  nombre: string;
  valor: number;
  porcentaje: number;
}

/** Estadísticas simples con barras de Bootstrap (sin librerías de gráficos). */
@Component({
  selector: 'app-estadisticas',
  templateUrl: './estadisticas.html',
})
export class Estadisticas {
  readonly reportes = input.required<ReportePublico[]>();
  readonly zonas = input.required<ZonaResumen[]>();
  readonly puntos = input.required<PuntoCaliente[]>();

  protected readonly porBarrio = computed(() =>
    this.barras(this.zonas().map((z) => ({ nombre: z.nombre, valor: z.cantidad }))),
  );

  protected readonly resumen = computed(() => {
    const zonas = this.zonas();
    const masCaliente = [...zonas].sort((a, b) => b.temperatura - a.temperatura)[0];
    return {
      total: this.reportes().length,
      barrios: zonas.length,
      criticos: zonas.filter((z) => z.nivel === 'naranja' || z.nivel === 'rojo').length,
      caliente: masCaliente?.nombre ?? '—',
      temperatura: masCaliente?.temperatura ?? 0,
    };
  });

  protected readonly porTipo = computed(() => {
    const conteo = new Map<TipoIncidente, number>();
    for (const r of this.reportes()) conteo.set(r.tipo, (conteo.get(r.tipo) ?? 0) + 1);
    return this.barras(
      [...conteo].map(([tipo, valor]) => ({ nombre: ETIQUETA_TIPO[tipo], valor })),
    );
  });

  protected readonly porMes = computed(() => {
    const conteo = new Map<string, number>();
    for (const r of this.reportes()) {
      const mes = r.fecha.slice(0, 7); // AAAA-MM
      conteo.set(mes, (conteo.get(mes) ?? 0) + 1);
    }
    return this.barras([...conteo].sort().map(([mes, valor]) => ({ nombre: mes, valor })));
  });

  protected nombreBarrio(id: string): string {
    return this.zonas().find((z) => z.id === id)?.nombre ?? id;
  }

  private barras(datos: { nombre: string; valor: number }[]): Barra[] {
    const maximo = Math.max(1, ...datos.map((d) => d.valor));
    return datos.map((d) => ({ ...d, porcentaje: (d.valor / maximo) * 100 }));
  }
}
