import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormField, form, maxLength, required, submit, validate } from '@angular/forms/signals';

import { ETIQUETA_TIPO, TIPOS_INCIDENTE } from '../../Interfaces/constantes';
import { Reporte, TipoIncidente } from '../../Interfaces/reporte.interface';
import { NotificacionesService } from '../../Services/notificaciones.service';
import { ReportesService } from '../../Services/reportes.service';
import { Punto } from '../mapa-calor/mapa-calor';

/** Formulario para crear (con punto del mapa) o editar un reporte propio. */
@Component({
  selector: 'app-reporte-formulario',
  imports: [FormField],
  templateUrl: './reporte-formulario.html',
})
export class ReporteFormulario {
  private readonly reportes = inject(ReportesService);
  private readonly avisos = inject(NotificacionesService);

  /** Punto elegido en el mapa (solo al crear). */
  readonly punto = input<Punto | null>(null);
  /** Si viene un reporte, el formulario edita en vez de crear. */
  readonly reporte = input<Reporte | null>(null);
  readonly guardado = output<void>();
  readonly cancelado = output<void>();

  protected readonly tipos = TIPOS_INCIDENTE;
  protected readonly etiqueta = ETIQUETA_TIPO;
  protected readonly cargando = signal(false);

  protected readonly modelo = signal({ tipo: '', descripcion: '', lat: 0, lng: 0 });

  protected readonly formulario = form(this.modelo, (campos) => {
    required(campos.tipo, { message: 'Elige qué tipo de incidente es.' });
    required(campos.descripcion, { message: 'Describe brevemente lo que ocurrió.' });
    maxLength(campos.descripcion, 280, { message: 'Máximo 280 caracteres.' });
    // lat/lng no se escriben a mano: se llenan al tocar el mapa. 0 significa "sin punto".
    validate(campos.lat, ({ value }) =>
      value() === 0 ? { kind: 'punto', message: 'Toca el mapa para elegir el lugar del incidente.' } : undefined,
    );
  });

  constructor() {
    // Cuando el mapa envía un punto nuevo, se copia al modelo.
    effect(() => {
      const punto = this.punto();
      if (punto) untracked(() => this.modelo.update((m) => ({ ...m, lat: punto.lat, lng: punto.lng })));
    });
    // Modo edición: se cargan los datos actuales del reporte.
    effect(() => {
      const r = this.reporte();
      if (r) {
        untracked(() =>
          this.modelo.set({ tipo: r.tipo, descripcion: r.descripcion, lat: r.lat, lng: r.lng }),
        );
      }
    });
  }

  protected async enviar(evento: Event): Promise<void> {
    evento.preventDefault();
    // Evita duplicados por doble clic o por presionar Enter dos veces.
    if (this.cargando()) return;
    await submit(this.formulario, async () => {
      this.cargando.set(true);
      try {
        const m = this.modelo();
        const datos = { lat: m.lat, lng: m.lng, tipo: m.tipo as TipoIncidente, descripcion: m.descripcion };
        const existente = this.reporte();
        if (existente) await this.reportes.actualizar(existente.id, datos);
        else await this.reportes.crear(datos);
        this.avisos.exito(existente ? 'Reporte actualizado.' : 'Reporte enviado de forma anónima.');
        this.guardado.emit();
      } catch (error) {
        await this.avisos.error(error); // 400 si el punto cae fuera de los barrios, 409 si está repetido
      } finally {
        this.cargando.set(false);
      }
    });
  }
}
