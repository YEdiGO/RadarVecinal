import { Component, inject, signal } from '@angular/core';
import { FormField, email, form, required, submit } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../Services/auth.service';
import { NotificacionesService } from '../../Services/notificaciones.service';

@Component({
  selector: 'app-login',
  imports: [FormField, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly avisos = inject(NotificacionesService);

  // 1) El modelo: un signal con los datos del formulario.
  protected readonly modelo = signal({ correo: '', clave: '' });

  // 2) El formulario: form() envuelve el modelo y agrega las validaciones de cada campo.
  protected readonly formulario = form(this.modelo, (campos) => {
    required(campos.correo, { message: 'Escribe tu correo.' });
    email(campos.correo, { message: 'El correo no es válido.' });
    required(campos.clave, { message: 'Escribe tu contraseña.' });
  });

  protected readonly cargando = signal(false);

  /** Cuentas de demostración (todas con clave 123456) para probar los dos actores. */
  protected readonly cuentasDemo = [
    { correo: 'vecino@barrio.com', actor: 'Vecino' },
    { correo: 'muni@huancayo.gob.pe', actor: 'Municipalidad' },
  ];

  protected usarCuenta(correo: string): void {
    this.modelo.set({ correo, clave: '123456' });
  }

  protected async enviar(evento: Event): Promise<void> {
    evento.preventDefault();
    // submit() marca todos los campos como "tocados" y solo ejecuta la función si el formulario es válido.
    await submit(this.formulario, async () => {
      this.cargando.set(true);
      try {
        const usuario = await this.auth.login(this.modelo());
        await this.router.navigateByUrl(this.auth.rutaInicial(usuario));
      } catch (error) {
        await this.avisos.error(error); // muestra el 401 del backend
      } finally {
        this.cargando.set(false);
      }
    });
  }
}
