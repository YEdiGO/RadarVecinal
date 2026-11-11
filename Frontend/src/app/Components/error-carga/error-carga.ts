import { Component, input, output } from '@angular/core';

/** Estado de error reutilizable con botón para volver a intentar la carga. */
@Component({
  selector: 'app-error-carga',
  templateUrl: './error-carga.html',
  styleUrl: './error-carga.css',
})
export class ErrorCarga {
  readonly titulo = input('No pudimos cargar la información');
  readonly mensaje = input('Revisa tu conexión e inténtalo nuevamente.');
  readonly reintentar = output<void>();
}
