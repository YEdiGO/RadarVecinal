import { Component, input, output } from '@angular/core';

/**
 * Ventana emergente reutilizable (usa las clases .modal de Bootstrap, sin su JavaScript).
 * Uso:  <app-modal titulo="Mi título" (cerrar)="...">  contenido  </app-modal>
 */
@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string>('');
  readonly grande = input(false);
  readonly cerrar = output<void>();
}
