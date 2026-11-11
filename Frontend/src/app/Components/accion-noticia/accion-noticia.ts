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
    return estado === 'Completada'
      ? 'success'
      : estado === 'En ejecución'
        ? 'warning'
        : 'secondary';
  }

  protected iconoTipo(tipo: string): string {
    return (
      {
        'Patrullaje de serenazgo': 'bi-shield-check',
        'Operativo con la policía': 'bi-badge-shield',
        Alumbrado: 'bi-lightbulb',
        'Campaña de prevención': 'bi-megaphone',
      }[tipo] ?? 'bi-tools'
    );
  }

  protected ancho(temperatura: number): number {
    return Math.min(100, Math.max(4, (temperatura / 45) * 100));
  }

  protected nivel(temperatura: number): string {
    if (temperatura > 30) return 'rojo';
    if (temperatura >= 18) return 'naranja';
    if (temperatura >= 8) return 'amarillo';
    return 'verde';
  }
}
