import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ETIQUETA_NIVEL, ETIQUETA_TIPO } from '../../Interfaces/constantes';
import { MiBarrio as Datos } from '../../Interfaces/panel.interface';
import { mensajeDeError } from '../../Services/api.service';
import { PanelesService } from '../../Services/paneles.service';
import { AccionNoticia } from '../accion-noticia/accion-noticia';
import { Cargando } from '../cargando/cargando';
import { ErrorCarga } from '../error-carga/error-carga';

/** Resumen del barrio del vecino: temperatura, reportes recientes y respuesta de la Municipalidad. */
@Component({
  selector: 'app-mi-barrio',
  imports: [AccionNoticia, Cargando, ErrorCarga, RouterLink],
  templateUrl: './mi-barrio.html',
})
export class MiBarrio implements OnInit {
  private readonly paneles = inject(PanelesService);

  protected readonly datos = signal<Datos | null>(null);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal('');
  protected readonly etiquetaNivel = ETIQUETA_NIVEL;
  protected readonly etiquetaTipo = ETIQUETA_TIPO;

  protected readonly maximoTipo = computed(() =>
    Math.max(1, ...(this.datos()?.zona?.tipos_frecuentes.map((t) => t.cantidad) ?? [1])),
  );

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  protected anchoTipo(cantidad: number): number {
    return (cantidad / this.maximoTipo()) * 100;
  }

  protected anchoTemperatura(temperatura: number): number {
    return Math.min(100, Math.max(4, (temperatura / 45) * 100));
  }

  protected async cargar(): Promise<void> {
    this.cargando.set(true);
    this.errorCarga.set('');
    try {
      const datos = await this.paneles.miBarrio();
      this.datos.set(datos);
      // Al abrir la pantalla, las noticias se consideran leídas (se apaga el punto rojo).
      // Si falla, no es crítico: los datos del barrio ya están cargados.
      await this.paneles.marcarLeidas(datos.noticias.map((n) => n.id)).catch(() => undefined);
      await this.paneles.refrescarNoticias();
    } catch (error) {
      this.errorCarga.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }
}
