import { Component, OnInit, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormField, form, maxLength, required, submit } from '@angular/forms/signals';

import { Accion, EstadoAccion, TipoAccion } from '../../Interfaces/accion.interface';
import { Barrio } from '../../Interfaces/barrio.interface';
import { ESTADOS_ACCION, TIPOS_ACCION } from '../../Interfaces/constantes';
import { AccionesService } from '../../Services/acciones.service';
import { NotificacionesService } from '../../Services/notificaciones.service';
import { ZonasService } from '../../Services/zonas.service';

const MAX_FOTOS = 4;
const MAX_BYTES = 5 * 1024 * 1024;

/** Registrar o editar una acción de la Municipalidad (con hasta 4 fotos). */
@Component({
  selector: 'app-accion-formulario',
  imports: [FormField],
  templateUrl: './accion-formulario.html',
})
export class AccionFormulario implements OnInit {
  private readonly acciones = inject(AccionesService);
  private readonly zonasService = inject(ZonasService);
  private readonly avisos = inject(NotificacionesService);

  readonly accion = input<Accion | null>(null);
  readonly barrioInicial = input<string>('');
  readonly guardado = output<void>();
  readonly cancelado = output<void>();

  protected readonly barrios = signal<Barrio[]>([]);
  protected readonly tipos = TIPOS_ACCION;
  protected readonly estados = ESTADOS_ACCION;
  protected readonly cargando = signal(false);

  protected readonly modelo = signal({
    id_barrio: '',
    tipo: 'Patrullaje de serenazgo',
    titulo: '',
    descripcion: '',
    fecha: new Date().toLocaleDateString('en-CA'), // AAAA-MM-DD en hora local
    estado: 'Planificada',
    fotos: [] as string[],
  });

  protected readonly formulario = form(this.modelo, (c) => {
    required(c.id_barrio, { message: 'Selecciona un barrio.' });
    required(c.titulo, { message: 'Escribe un título.' });
    maxLength(c.titulo, 100, { message: 'Máximo 100 caracteres.' });
    required(c.descripcion, { message: 'Describe la acción.' });
    maxLength(c.descripcion, 400, { message: 'Máximo 400 caracteres.' });
    required(c.fecha, { message: 'Elige una fecha.' });
  });

  constructor() {
    effect(() => {
      const a = this.accion();
      const barrio = this.barrioInicial();
      untracked(() => {
        if (a) {
          this.modelo.set({
            id_barrio: a.id_barrio, tipo: a.tipo, titulo: a.titulo, descripcion: a.descripcion,
            fecha: a.fecha.slice(0, 10), estado: a.estado, fotos: a.fotos,
          });
        } else if (barrio) {
          this.modelo.update((m) => ({ ...m, id_barrio: barrio }));
        }
      });
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      this.barrios.set(await this.zonasService.barrios());
    } catch (error) {
      await this.avisos.error(error);
    }
  }

  /** Lee las fotos elegidas y las guarda como texto base64 dentro del modelo. */
  protected async elegirFotos(evento: Event): Promise<void> {
    const archivos = Array.from((evento.target as HTMLInputElement).files ?? []);
    const nuevas: string[] = [];
    for (const archivo of archivos) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(archivo.type) || archivo.size > MAX_BYTES) {
        await this.avisos.aviso('Foto no válida', 'Solo se aceptan imágenes JPG, PNG o WebP de hasta 5 MB.');
        continue;
      }
      nuevas.push(await this.leer(archivo));
    }
    this.modelo.update((m) => ({ ...m, fotos: [...m.fotos, ...nuevas].slice(0, MAX_FOTOS) }));
    (evento.target as HTMLInputElement).value = '';
  }

  protected quitarFoto(indice: number): void {
    this.modelo.update((m) => ({ ...m, fotos: m.fotos.filter((_, i) => i !== indice) }));
  }

  private leer(archivo: File): Promise<string> {
    return new Promise((resolver, rechazar) => {
      const lector = new FileReader();
      lector.onload = () => resolver(lector.result as string);
      lector.onerror = () => rechazar(lector.error);
      lector.readAsDataURL(archivo);
    });
  }

  protected async enviar(evento: Event): Promise<void> {
    evento.preventDefault();
    await submit(this.formulario, async () => {
      this.cargando.set(true);
      try {
        const m = this.modelo();
        const datos = { ...m, tipo: m.tipo as TipoAccion, estado: m.estado as EstadoAccion };
        const existente = this.accion();
        if (existente) await this.acciones.actualizar(existente.id, datos);
        else await this.acciones.crear(datos);
        this.avisos.exito(existente ? 'Acción actualizada.' : 'Acción registrada.');
        this.guardado.emit();
        if (!existente) this.modelo.update((x) => ({ ...x, titulo: '', descripcion: '', fotos: [] }));
      } catch (error) {
        await this.avisos.error(error);
      } finally {
        this.cargando.set(false);
      }
    });
  }
}
