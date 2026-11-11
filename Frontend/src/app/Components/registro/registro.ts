import { Component, OnInit, inject, signal } from '@angular/core';
import { FormField, email, form, minLength, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';

import { Barrio } from '../../Interfaces/barrio.interface';
import { mensajeDeError } from '../../Services/api.service';
import { AuthService } from '../../Services/auth.service';
import { NotificacionesService } from '../../Services/notificaciones.service';
import { ZonasService } from '../../Services/zonas.service';

@Component({
  selector: 'app-registro',
  imports: [FormField, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.css',
})
export class Registro implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly zonasService = inject(ZonasService);
  private readonly router = inject(Router);
  private readonly avisos = inject(NotificacionesService);

  protected readonly barrios = signal<Barrio[]>([]);
  protected readonly cargando = signal(false);
  protected readonly cargandoBarrios = signal(true);
  protected readonly errorBarrios = signal('');

  protected readonly modelo = signal({ nombre: '', correo: '', clave: '', id_barrio: '' });

  protected readonly formulario = form(this.modelo, (campos) => {
    required(campos.nombre, { message: 'Escribe tu nombre completo.' });
    minLength(campos.nombre, 3, { message: 'El nombre debe tener al menos 3 letras.' });
    required(campos.correo, { message: 'Escribe tu correo.' });
    email(campos.correo, { message: 'El correo no es válido.' });
    required(campos.clave, { message: 'Crea una contraseña.' });
    minLength(campos.clave, 6, { message: 'La contraseña debe tener al menos 6 caracteres.' });
    required(campos.id_barrio, { message: 'Elige tu barrio.' });
  });

  async ngOnInit(): Promise<void> {
    await this.cargarBarrios();
  }

  protected async cargarBarrios(): Promise<void> {
    this.cargandoBarrios.set(true);
    this.errorBarrios.set('');
    try {
      this.barrios.set(await this.zonasService.barrios());
    } catch (error) {
      this.errorBarrios.set(mensajeDeError(error));
    } finally {
      this.cargandoBarrios.set(false);
    }
  }

  protected async enviar(evento: Event): Promise<void> {
    evento.preventDefault();
    await submit(this.formulario, async () => {
      this.cargando.set(true);
      try {
        const usuario = await this.auth.registrar(this.modelo());
        this.avisos.exito('Cuenta creada. La Municipalidad la revisará pronto.');
        await this.router.navigateByUrl(this.auth.rutaInicial(usuario)); // → /cuenta (pendiente)
      } catch (error) {
        await this.avisos.error(error); // 409 si el correo ya existe, 400 si el barrio no existe...
      } finally {
        this.cargando.set(false);
      }
    });
  }
}
