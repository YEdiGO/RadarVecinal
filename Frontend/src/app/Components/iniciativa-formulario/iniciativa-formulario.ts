import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';

import { ESTADOS_INICIATIVA } from '../../Interfaces/constantes';
import { EstadoIniciativa, Iniciativa } from '../../Interfaces/iniciativa.interface';
import { IniciativasService } from '../../Services/iniciativas.service';
import { NotificacionesService } from '../../Services/notificaciones.service';

/** Crear o editar una iniciativa vecinal (el barrio es el del vecino). */
@Component({
  selector: 'app-iniciativa-formulario',
  imports: [FormField],
  templateUrl: './iniciativa-formulario.html',
})
export class IniciativaFormulario {
  private readonly servicio = inject(IniciativasService);
  private readonly avisos = inject(NotificacionesService);

  readonly iniciativa = input<Iniciativa | null>(null);
  readonly guardado = output<void>();
  readonly cancelado = output<void>();

  protected readonly estados = ESTADOS_INICIATIVA;
  protected readonly cargando = signal(false);
  protected readonly modelo = signal({ titulo: '', descripcion: '', meta: '', estado: 'Propuesta' });

  protected readonly formulario = form(this.modelo, (c) => {
    required(c.titulo, { message: 'Escribe un título.' });
    maxLength(c.titulo, 100, { message: 'Máximo 100 caracteres.' });
    required(c.descripcion, { message: 'Describe la iniciativa.' });
    maxLength(c.descripcion, 400, { message: 'Máximo 400 caracteres.' });
    required(c.meta, { message: 'Indica una meta.' });
    maxLength(c.meta, 200, { message: 'Máximo 200 caracteres.' });
    required(c.estado, { message: 'Elige un estado.' });
  });

  constructor() {
    effect(() => {
      const i = this.iniciativa();
      if (i) untracked(() => this.modelo.set({ titulo: i.titulo, descripcion: i.descripcion, meta: i.meta, estado: i.estado }));
    });
  }

  protected async enviar(evento: Event): Promise<void> {
    evento.preventDefault();
    await submit(this.formulario, async () => {
      this.cargando.set(true);
      try {
        const datos = { ...this.modelo(), estado: this.modelo().estado as EstadoIniciativa };
        const existente = this.iniciativa();
        if (existente) await this.servicio.actualizar(existente.id, datos);
        else await this.servicio.crear(datos);
        this.avisos.exito(existente ? 'Iniciativa actualizada.' : 'Iniciativa creada.');
        this.guardado.emit();
      } catch (error) {
        await this.avisos.error(error); // 400 si intentas reabrir una iniciativa cumplida
      } finally {
        this.cargando.set(false);
      }
    });
  }
}
