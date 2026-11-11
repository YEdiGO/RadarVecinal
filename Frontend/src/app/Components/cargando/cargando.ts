import { Component, input } from '@angular/core';

/** Indicador de carga reutilizable para pantallas y paneles. */
@Component({
  selector: 'app-cargando',
  templateUrl: './cargando.html',
  styleUrl: './cargando.css',
})
export class Cargando {
  readonly mensaje = input('Cargando información…');
}
