import { expect, type APIRequestContext } from "@playwright/test";

import { API, nitDePrueba } from "./datos";
import { Consola } from "./consola";

/**
 * Una empresa lista para operar, armada **por la API**.
 *
 * Configurar una empresa a mano son cinco pasos y unos treinta campos: hacerlo
 * por la pantalla en cada prueba de ventas costaría minutos y probaría el
 * asistente de configuración una y otra vez en vez de lo que se quiere mirar.
 * El asistente tiene —tendrá— su propia prueba.
 *
 * Queda con lo mínimo para facturar de verdad: régimen, representante, sede
 * principal, actividad económica con su tarifa de ICA, plan de cuentas,
 * resolución de la DIAN vigente, un cliente, un proveedor y un producto con
 * existencia.
 */
export interface EmpresaLista {
  empresaId: string;
  razonSocial: string;
  nit: string;
  dv: string;
  /** Con quién entra la prueba por la pantalla. */
  acceso: { email: string; password: string };
  /** Token con empresa elegida, para pedirle cosas a la API. */
  token: string;
  cliente: { id: string; nombre: string };
  proveedor: { id: string; nombre: string };
  producto: {
    id: string;
    codigo: string;
    nombre: string;
    costo: number;
    precio: number;
    existencia: number;
  };
}

const MEDELLIN = "05001";

/** El día de hoy en Colombia, que es el que acepta el backend. */
export const hoyCol = (): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

/**
 * Más productos en una empresa ya lista, para las pruebas que necesitan una
 * lista larga: un desplegable con un solo producto cabe en cualquier parte.
 */
export async function agregarProductos(
  api: APIRequestContext,
  e: EmpresaLista,
  cuantos: number,
): Promise<void> {
  const cabeceras = { Authorization: `Bearer ${e.token}` };
  const plan = (await api
    .get(`${API}/plan-cuentas`, { headers: cabeceras })
    .then((r) => r.json())) as
    | { id: string; codigo: string; es_auxiliar?: boolean }[]
    | { datos: { id: string; codigo: string; es_auxiliar?: boolean }[] };
  const cuentas = Array.isArray(plan) ? plan : plan.datos;
  const cuenta = (prefijo: string) =>
    cuentas
      .filter((c) => c.codigo.startsWith(prefijo))
      .sort((a, b) => b.codigo.length - a.codigo.length)[0]?.id;

  for (let i = 0; i < cuantos; i += 1) {
    const r = await api.post(`${API}/productos`, {
      headers: cabeceras,
      data: {
        codigo: `E2E-R${i}-${Date.now().toString().slice(-5)}`,
        nombre: `Repuesto de prueba ${i + 1}`,
        unidadMedida: "UND",
        ivaTarifa: 19,
        precioVenta: 50_000,
        cuentaInventarioId: cuenta("1435"),
        cuentaCostoVentaId: cuenta("6135"),
        cuentaIngresoId: cuenta("4135"),
      },
    });
    expect(r.ok(), await r.text()).toBeTruthy();
  }
}

export async function prepararEmpresa(
  api: APIRequestContext,
  nombre = `e2e Ferretería ${Date.now()}`,
  /** Productos de relleno, para las pruebas que necesitan una lista larga. */
  masProductos = 0,
): Promise<EmpresaLista> {
  const consola = await Consola.entrar(api);
  const suya = await consola.crearCuenta(nombre, "EMPRESARIAL");

  const pedir = async (
    metodo: "get" | "post",
    ruta: string,
    token: string,
    datos?: unknown,
  ): Promise<unknown> => {
    const r = await api[metodo](`${API}${ruta}`, {
      headers: { Authorization: `Bearer ${token}` },
      ...(datos === undefined ? {} : { data: datos }),
    });
    expect(r.ok(), `${metodo.toUpperCase()} ${ruta}: ${await r.text()}`).toBeTruthy();
    return r.json();
  };

  // 1. Entrar como su administrador y crear la empresa.
  const acceso = { email: suya.email, password: suya.password };
  const sesion = (await api
    .post(`${API}/auth/login`, { data: acceso })
    .then((r) => r.json())) as { token: string };

  const { nit, dv } = nitDePrueba();
  const empresa = (await pedir("post", "/empresas", sesion.token, {
    tipoPersona: "JURIDICA",
    razonSocial: nombre,
    nombreComercial: nombre,
    nit,
    dv,
    sectores: ["COMERCIO"],
    grupoNiif: "GRUPO_2",
    fechaInicioOperaciones: "2020-01-01",
  })) as { id: string };

  // 2. Elegir la empresa: el token de sesión no puede leer datos contables.
  const conEmpresa = (await pedir("post", "/auth/empresa", sesion.token, {
    empresaId: empresa.id,
  })) as { token: string };
  const token = conEmpresa.token;

  // 3. Situación legal: régimen, representante y actividad con su ICA.
  await pedir("post", "/empresa-legal/regimenes", token, {
    tipoRegimen: "RESPONSABLE_IVA",
    codigoResponsabilidadDian: "O-48",
    fechaInicio: "2020-01-01",
  });
  await pedir("post", "/empresa-legal/representantes", token, {
    nombreCompleto: "Luisa Peña Gómez",
    tipoDocumento: "CC",
    numeroDocumento: "43118077",
    cargo: "Gerente general",
    fechaInicio: "2020-01-01",
  });
  await pedir("post", "/empresa-legal/actividades", token, {
    codigoCiiu: "4530",
    descripcion: "Comercio de partes y piezas",
    esPrincipal: true,
    tarifaIcaPorMil: 4.14,
    municipioCodigo: MEDELLIN,
    fechaInicio: "2020-01-01",
  });

  // 4. Sede principal.
  await pedir("post", "/empresas/actual/sedes", token, {
    codigo: "001",
    nombre: "Principal",
    direccion: "Cra. 43A #18-95",
    municipioCodigo: MEDELLIN,
    esPrincipal: true,
  });

  // 4b. Impuestos: el ICA del municipio de la sede, y el resumen confirmado.
  //     El IVA ya quedó contestado con el régimen del paso 3.
  const ica = await api.put(`${API}/empresa-impuestos/ica/${MEDELLIN}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { esAgenteRetenedor: false, esAutorretenedor: false, tarifaProvisionalPorMil: 4.14 },
  });
  expect(ica.ok(), `PUT /empresa-impuestos/ica: ${await ica.text()}`).toBeTruthy();
  await pedir("post", "/empresa-impuestos/confirmar", token);

  // 5. Plan de cuentas: el que el sistema sugiere para su sector.
  const sugerencia = (await pedir("get", "/plan-cuentas/sugerencia", token)) as
    | { codigo: string }[]
    | { cuentas: { codigo: string }[] };
  const codigos = (Array.isArray(sugerencia) ? sugerencia : sugerencia.cuentas).map(
    (c) => c.codigo,
  );
  await pedir("post", "/plan-cuentas/aplicar-sugerencia", token, { codigos });

  // 6. Resolución de facturación vigente.
  const anio = Number(hoyCol().slice(0, 4));
  await pedir("post", "/resoluciones", token, {
    tipoDocumento: "FACTURA_VENTA",
    numeroResolucion: "18764000001234",
    prefijo: "FE",
    rangoDesde: 1,
    rangoHasta: 5000,
    fechaResolucion: `${anio}-01-15`,
    fechaVigenciaDesde: `${anio}-01-15`,
    fechaVigenciaHasta: `${anio + 1}-12-31`,
    ambiente: "PRODUCCION",
    claveTecnica: "clave-tecnica-de-prueba",
  });

  // 7. El período contable del mes, abierto: sin él no se puede facturar.
  //    No se abre solo al crear la empresa, y es lo primero con lo que choca
  //    quien va a emitir su primera factura.
  const hoy = hoyCol();
  await pedir("post", "/periodos", token, {
    anio: Number(hoy.slice(0, 4)),
    mes: Number(hoy.slice(5, 7)),
  });

  // Las notas crédito tienen su propia autorización de la DIAN.
  await pedir("post", "/resoluciones", token, {
    tipoDocumento: "NOTA_CREDITO",
    numeroResolucion: "18764000005678",
    prefijo: "NC",
    rangoDesde: 1,
    rangoHasta: 5000,
    fechaResolucion: `${anio}-01-15`,
    fechaVigenciaDesde: `${anio}-01-15`,
    fechaVigenciaHasta: `${anio + 1}-12-31`,
    ambiente: "PRODUCCION",
    claveTecnica: "clave-tecnica-de-prueba",
  });

  // Lista para operar: si algo de lo anterior faltara, acá se sabe.
  const estado = (await pedir("get", "/empresas/actual/estado-configuracion", token)) as {
    completa: boolean;
    pasos: { clave: string; estado: string; faltantes: { etiqueta: string }[] }[];
  };
  expect(
    estado.completa,
    `la empresa quedó a medias: ${estado.pasos
      .filter((p) => p.estado !== "LISTO")
      .map((p) => `${p.clave} (${p.faltantes.map((f) => f.etiqueta).join(", ")})`)
      .join("; ")}`,
  ).toBe(true);

  // 7. Un cliente y un proveedor.
  const cliente = (await pedir("post", "/terceros", token, {
    tipoPersona: "NATURAL",
    tipoDocumento: "CC",
    numeroDocumento: "71884209",
    primerNombre: "José",
    primerApellido: "Vargas",
    municipioCodigo: MEDELLIN,
    esCliente: true,
    responsabilidadesDian: ["R-99-PN"],
  })) as { id: string; nombre?: string };
  const proveedor = (await pedir("post", "/terceros", token, {
    tipoPersona: "JURIDICA",
    tipoDocumento: "NIT",
    numeroDocumento: "830045912",
    dv: "7",
    razonSocial: "Distribuidora del Valle S.A.S.",
    municipioCodigo: MEDELLIN,
    esProveedor: true,
    responsabilidadesDian: ["O-48"],
  })) as { id: string; nombre?: string };

  // 8. Un producto con existencia, para poder vender.
  type CuentaPlan = { id: string; codigo: string; es_auxiliar?: boolean; esAuxiliar?: boolean };
  const plan = (await pedir("get", "/plan-cuentas", token)) as CuentaPlan[] | { datos: CuentaPlan[] };
  const cuentas = Array.isArray(plan) ? plan : plan.datos;

  /**
   * La auxiliar de ese grupo. Las cuentas que agrupan no reciben movimientos
   * —4135 agrupa, 413505 recibe—, y el sistema lo rechaza con ese mensaje.
   */
  const recargarPlan = async () => {
    const otra = (await pedir("get", "/plan-cuentas", token)) as
      | CuentaPlan[]
      | { datos: CuentaPlan[] };
    cuentas.splice(0, cuentas.length, ...(Array.isArray(otra) ? otra : otra.datos));
  };

  /**
   * Se asegura de que exista una auxiliar de ese grupo, creándola del catálogo
   * del Decreto 2650 si el plan sugerido solo trajo el grupo. Es lo que hace
   * un contador antes de facturar por primera vez.
   */
  const asegurarAuxiliar = async (prefijo: string, nombre: string) => {
    const hay = cuentas.some(
      (c) => c.codigo.startsWith(prefijo) && c.codigo.length > prefijo.length,
    );
    if (hay) return;
    await pedir("post", "/plan-cuentas", token, { codigo: `${prefijo}05`, nombre });
    await recargarPlan();
  };

  const cuenta = (prefijo: string) => {
    const suyas = cuentas.filter((c) => c.codigo.startsWith(prefijo));
    const auxiliares = suyas.filter((c) => c.es_auxiliar ?? c.esAuxiliar ?? false);
    const elegida = (auxiliares.length > 0 ? auxiliares : suyas).sort(
      (a, b) => b.codigo.length - a.codigo.length,
    )[0];
    expect(elegida, `no hay una cuenta auxiliar que empiece por ${prefijo}`).toBeDefined();
    return elegida.id;
  };

  await asegurarAuxiliar("1435", "Mercancías no fabricadas por la empresa");
  await asegurarAuxiliar("4135", "Comercio al por mayor y al por menor");
  await asegurarAuxiliar("6135", "Costo de mercancías vendidas");

  const producto = (await pedir("post", "/productos", token, {
    codigo: `E2E-${Date.now().toString().slice(-6)}`,
    nombre: "Taladro percutor",
    unidadMedida: "UND",
    ivaTarifa: 19,
    precioVenta: 150_000,
    cuentaInventarioId: cuenta("1435"),
    cuentaCostoVentaId: cuenta("6135"),
    cuentaIngresoId: cuenta("4135"),
  })) as { id: string; codigo: string; nombre: string };

  await pedir("post", `/productos/${producto.id}/movimientos/carga-inicial`, token, {
    fecha: hoyCol(),
    cantidad: 10,
    costoUnitario: 100_000,
    motivo: "Existencia inicial para la prueba",
  });

  for (let i = 0; i < masProductos; i += 1) {
    await pedir("post", "/productos", token, {
      codigo: `E2E-R${i}-${Date.now().toString().slice(-5)}`,
      nombre: `Repuesto de prueba ${i + 1}`,
      unidadMedida: "UND",
      ivaTarifa: 19,
      precioVenta: 50_000,
      cuentaInventarioId: cuenta("1435"),
      cuentaCostoVentaId: cuenta("6135"),
      cuentaIngresoId: cuenta("4135"),
    });
  }

  return {
    empresaId: empresa.id,
    razonSocial: nombre,
    nit,
    dv,
    acceso,
    token,
    cliente: { id: cliente.id, nombre: cliente.nombre ?? "José Vargas" },
    proveedor: { id: proveedor.id, nombre: proveedor.nombre ?? "Distribuidora del Valle S.A.S." },
    producto: {
      id: producto.id,
      codigo: producto.codigo,
      nombre: producto.nombre,
      costo: 100_000,
      precio: 150_000,
      existencia: 10,
    },
  };
}
