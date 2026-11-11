import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Barrio } from '../../Interfaces/barrio.interface';
import { IniciativaConParticipacion } from '../../Interfaces/iniciativa.interface';
import { mensajeDeError } from '../../Services/api.service';
import { IniciativasService } from '../../Services/iniciativas.service';
import { ZonasService } from '../../Services/zonas.service';
import { Cargando } from '../cargando/cargando';
import { ErrorCarga } from '../error-carga/error-carga';
import { IniciativaFormulario } from '../iniciativa-formulario/iniciativa-formulario';
import { Modal } from '../modal/modal';

@Component({
  selector: 'app-iniciativas',
  imports: [RouterLink, Modal, IniciativaFormulario, Cargando, ErrorCarga],
  templateUrl: './iniciativas.html',
})
export class Iniciativas implements OnInit {
  private readonly servicio = inject(IniciativasService);
  private readonly zonasService = inject(ZonasService);

  protected readonly lista = signal<IniciativaConParticipacion[]>([]);
  protected readonly barrios = signal<Barrio[]>([]);
  protected readonly creando = signal(false);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal('');

  protected readonly resumen = computed(() => {
    const lista = this.lista();
    return {
      total: lista.length,
      enCurso: lista.filter((i) => i.estado === 'En curso').length,
      cumplidas: lista.filter((i) => i.estado === 'Cumplida').length,
      participantes: lista.reduce((total, i) => total + i.participantes, 0),
    };
  });

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  protected async cargar(mostrarCarga = true): Promise<void> {
    if (mostrarCarga) this.cargando.set(true);
    this.errorCarga.set('');
    try {
      const [lista, barrios] = await Promise.all([
        this.servicio.listar(),
        this.zonasService.barrios(),
      ]);
      this.lista.set(lista);
      this.barrios.set(barrios);
    } catch (error) {
      this.errorCarga.set(mensajeDeError(error));
    } finally {
      if (mostrarCarga) this.cargando.set(false);
    }
  }

  protected nombreBarrio(id: string): string {
    return this.barrios().find((b) => b.id === id)?.nombre ?? id;
  }

  protected async recargar(): Promise<void> {
    this.creando.set(false);
    await this.cargar(false);
  }

  protected color(estado: string): string {
    return (
      { Propuesta: 'secondary', 'En curso': 'primary', Cumplida: 'success', Cancelada: 'danger' }[
        estado
      ] ?? 'secondary'
    );
  }

  protected icono(estado: string): string {
    return (
      {
        Propuesta: 'bi-lightbulb',
        'En curso': 'bi-arrow-repeat',
        Cumplida: 'bi-check2-circle',
        Cancelada: 'bi-slash-circle',
      }[estado] ?? 'bi-megaphone'
    );
  }
}
