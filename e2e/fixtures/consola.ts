import { test as base, expect, type APIRequestContext, type Page } from "@playwright/test";

import { ADMIN, API, correoDePrueba, nitDePrueba } from "./datos";

export interface CuentaCreada {
  id: string;
  nombre: string;
  email: string;
  password: string;
}

/**
 * Lo que la prueba necesita tener listo, creado **por la API y no por la
 * pantalla**: montar una cuenta a mano en el navegador antes de cada prueba
 * la haría lenta y frágil, y además probaría el alta una y otra vez en vez
 * de lo que se quiere mirar.
 *
 * El alta se prueba una sola vez, en su propia prueba y por la pantalla.
 */
export class Consola {
  constructor(
    private readonly api: APIRequestContext,
    private readonly token: string,
  ) {}

  static async entrar(api: APIRequestContext): Promise<Consola> {
    const r = await api.post(`${API}/auth/login`, {
      data: { email: ADMIN.email, password: ADMIN.password },
    });
    expect(r.ok(), "el superadministrador tiene que poder entrar").toBeTruthy();
    const { token, ambito } = (await r.json()) as { token: string; ambito: string };
    expect(ambito).toBe("PLATAFORMA");
    return new Consola(api, token);
  }

  private get cabeceras() {
    return { Authorization: `Bearer ${this.token}` };
  }

  /** Una cuenta nueva con su administrador, lista para usar. */
  async crearCuenta(nombre: string, plan = "PROFESIONAL"): Promise<CuentaCreada> {
    const email = correoDePrueba("cuenta");
    const r = await this.api.post(`${API}/plataforma/cuentas`, {
      headers: this.cabeceras,
      data: { email, nombreCuenta: nombre, nombreAdministrador: "Laura Gómez", plan },
    });
    expect(r.ok(), await r.text()).toBeTruthy();
    const d = (await r.json()) as { tenantId: string; password?: string };
    return { id: d.tenantId, nombre, email, password: d.password ?? "" };
  }

  /** Una empresa con NIT propio: el dígito de verificación sale del NIT. */
  async crearEmpresa(cuentaId: string, razonSocial: string) {
    const { nit, dv } = nitDePrueba();
    const r = await this.api.post(`${API}/plataforma/cuentas/${cuentaId}/empresas`, {
      headers: this.cabeceras,
      data: {
        tipoPersona: "JURIDICA",
        razonSocial,
        nit,
        dv,
        grupoNiif: "GRUPO_2",
        fechaInicioOperaciones: "2026-01-01",
        sectores: ["COMERCIO"],
      },
    });
    expect(r.ok(), await r.text()).toBeTruthy();
  }

  async registrarPago(cuentaId: string, monto: number, fecha: string) {
    const r = await this.api.post(`${API}/plataforma/cuentas/${cuentaId}/pagos`, {
      headers: this.cabeceras,
      data: { monto, fecha, medio: "TRANSFERENCIA" },
    });
    expect(r.ok(), await r.text()).toBeTruthy();
  }

  async suscripcion(cuentaId: string) {
    const r = await this.api.get(`${API}/plataforma/cuentas/${cuentaId}/suscripcion`, {
      headers: this.cabeceras,
    });
    expect(r.ok()).toBeTruthy();
    return (await r.json()) as {
      precio: number | null;
      estado: { saldo: number; vencido: number; diasMora: number };
    };
  }

  async cuenta(cuentaId: string) {
    const r = await this.api.get(`${API}/plataforma/cuentas/${cuentaId}`, {
      headers: this.cabeceras,
    });
    expect(r.ok()).toBeTruthy();
    return (await r.json()) as {
      cuenta: { nombre: string; estado: string; plan: string; maxUsuarios: number };
      usuarios: { email: string; activo: boolean }[];
      bitacora: { accion: string }[];
    };
  }
}

/** El aviso que sale arriba a la derecha (SweetAlert2) cuando algo salió bien. */
export async function esperarAviso(page: Page, texto: RegExp) {
  await expect(page.locator(".swal2-container").getByText(texto)).toBeVisible();
}

export const test = base.extend<{ consola: Consola }>({
  consola: async ({ request }, usar) => {
    await usar(await Consola.entrar(request));
  },
});

export { expect };
