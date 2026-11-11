import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';

import { Accion } from '../../Interfaces/accion.interface';

/** Tarjeta de una acción oficial; si está completada muestra la temperatura antes y después. */
@Component({
  selector: 'app-accion-noticia',
  imports: [DatePipe],
  templateUrl: './accion-noticia.html',
})
export class AccionNoticia {
  readonly accion = input.required<Accion>();
  /** Temperatura actual del barrio, para comparar con la de cuando se completó. */
  readonly temperaturaActual = input<number | null>(null);

  protected colorEstado(estado: string): string {
    return estado === 'Completada' ? 'success' : estado === 'En ejecución' ? 'warning' : 'secondary';
  }
}
