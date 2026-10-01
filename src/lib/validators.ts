import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "El email es requerido").email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// --- Cotizaciones (módulo 6 del backend) ---
const PCT_IVA_VALIDOS = [0, 5, 19];

// Línea flexible: producto del catálogo O ítem libre con descripción.
//
// La cotización puede nombrar algo que todavía no existe como producto —no
// mueve inventario, así que no le hace falta—. Convertirla en venta sí lo
// exige, y el backend lo dice con nombre propio cuando llega el momento.
export const lineaCotizacionSchema = z
  .object({
    productoId: z.union([z.string().uuid(), z.literal("")]).optional(),
    descripcion: z.string().max(300).optional(),
    cantidad: z.number({ message: "Requerido" }).positive("La cantidad debe ser mayor a 0"),
    precioUnitario: z.number({ message: "Requerido" }).min(0, "Precio inválido"),
    porcentajeIva: z.number().refine((valor) => PCT_IVA_VALIDOS.includes(valor), "IVA inválido"),
  })
  .refine(
    (linea) =>
      (linea.productoId && linea.productoId.length > 0) ||
      (linea.descripcion && linea.descripcion.trim().length > 0),
    { message: "Elija un producto o describa el ítem", path: ["productoId"] },
  );

// `validoHasta` es opcional: si no se fija, lo calcula el backend con la
// política de la empresa y lo GUARDA. Fijarlo acá es para el cliente que pide
// un plazo distinto.
export const cotizacionSchema = z.object({
  terceroId: z.string().uuid("Seleccione un cliente"),
  validoHasta: z.string().optional(),
  observacion: z.string().max(300).optional(),
  lineas: z.array(lineaCotizacionSchema).min(1, "Agregue al menos una línea"),
});

export type CotizacionFormData = z.infer<typeof cotizacionSchema>;


// --- Gastos ---
export const gastoSchema = z.object({
  tipoGasto: z.string().min(1, "Indique el tipo de gasto").max(50),
  cuentaId: z.string().uuid("Seleccione la cuenta contable"),
  // Reason: opcional → "" = no seleccionado (el payload lo omite); si hay valor, debe ser UUID.
  terceroId: z.union([z.string().uuid(), z.literal("")]).optional(),
  medioPago: z.enum([
    "EFECTIVO",
    "TRANSFERENCIA",
    "TARJETA",
    "CHEQUE",
    "CONSIGNACION",
    "NEQUI",
    "DAVIPLATA",
  ]),
  monto: z.number({ message: "Requerido" }).positive("El monto debe ser mayor a 0"),
  descripcion: z.string().max(500).optional(),
});

export type GastoFormData = z.infer<typeof gastoSchema>;

// --- Productos ---
const PCT_IVA_PRODUCTO = [0, 5, 19];

export const productoSchema = z.object({
  referencia: z.string().min(1, "La referencia es requerida").max(50),
  codigoBarras: z.string().max(100).optional(),
  nombre: z.string().min(1, "El nombre es requerido").max(255),
  descripcion: z.string().optional(),
  tipoUso: z.enum(["VENTA", "REPUESTO", "AMBOS"]),
  precioVenta: z.number({ message: "Requerido" }).min(0, "Inválido"),
  precioCompra: z.number({ message: "Requerido" }).min(0, "Inválido"),
  precioMinimoVenta: z.number({ message: "Requerido" }).min(0, "Inválido"),
  stockMinimo: z.number({ message: "Requerido" }).min(0, "Inválido"),
  pctIva: z.number().refine((valor) => PCT_IVA_PRODUCTO.includes(valor), "IVA inválido"),
  aplicaIva: z.boolean(),
  unidadMedida: z.string().min(1, "Requerido").max(20),
  categoriaId: z.union([z.string().uuid(), z.literal("")]).optional(),
  ctaInventarioId: z.string().uuid("Seleccione la cuenta de inventario"),
  ctaIngresosId: z.string().uuid("Seleccione la cuenta de ingresos"),
});

export type ProductoFormData = z.infer<typeof productoSchema>;

// --- Ventas (módulo 6 del backend) ---
//
// El precio NO se valida contra el piso: vender por debajo se autoriza, no se
// bloquea. Bloquear duro empuja al vendedor a inventar productos falsos, que es
// peor que la rebaja — el formulario avisa, y el director firma después.
export const lineaVentaSchema = z.object({
  productoId: z.string().uuid("Seleccione un producto"),
  cantidad: z.number({ message: "Requerido" }).positive("La cantidad debe ser mayor a 0"),
  precioUnitario: z.number({ message: "Requerido" }).min(0, "Precio inválido"),
  porcentajeIva: z.number().refine((valor) => [0, 5, 19].includes(valor), "IVA inválido"),
});

export const ventaSchema = z.object({
  terceroId: z.string().uuid("Seleccione un cliente"),
  condicion: z.enum(["CONTADO", "CREDITO"]),
  fecha: z.string().optional(),
  observacion: z.string().max(300).optional(),
  lineas: z.array(lineaVentaSchema).min(1, "Agregue al menos una línea"),
});

export type VentaFormData = z.infer<typeof ventaSchema>;

// --- Compras ---
//
// La compra registra la factura del PROVEEDOR: su número, su fecha. Por eso no
// hay medio de pago ni casilla de retención —pagar es otro evento y la
// retención se calcula al 2,5 % o se escribe para cuadrar con el papel—.
export const lineaCompraSchema = z.object({
  productoId: z.string().uuid("Seleccione un producto"),
  cantidad: z.number({ message: "Requerido" }).positive("La cantidad debe ser mayor a 0"),
  costoUnitario: z.number({ message: "Requerido" }).min(0, "Costo inválido"),
  porcentajeIva: z.number().refine((valor) => [0, 5, 19].includes(valor), "IVA inválido"),
});

export const compraSchema = z.object({
  terceroId: z.string().uuid("Seleccione un proveedor"),
  numeroFactura: z
    .string()
    .min(1, "El número de la factura del proveedor es obligatorio")
    .max(40),
  fecha: z.string().min(1, "Requerido"),
  condicion: z.enum(["CONTADO", "CREDITO"]),
  /** Vacío = el backend calcula el 2,5 %. Escrito = cuadra con la factura. */
  retefuente: z.number().min(0, "Inválido").optional(),
  observacion: z.string().max(300).optional(),
  lineas: z.array(lineaCompraSchema).min(1, "Agregue al menos una línea"),
});

export type CompraFormData = z.infer<typeof compraSchema>;

// --- Órdenes de compra ---
export const ordenCompraSchema = z.object({
  proveedorId: z.string().uuid("Seleccione un proveedor"),
  productoId: z.string().uuid("Seleccione un producto"),
  cantidadSolicitada: z.number({ message: "Requerido" }).positive("La cantidad debe ser mayor a 0"),
});

export type OrdenCompraFormData = z.infer<typeof ordenCompraSchema>;

// --- Órdenes de trabajo (taller) ---
export const ordenTrabajoSchema = z.object({
  terceroId: z.string().uuid("Seleccione un cliente"),
  tecnicoId: z.string().uuid("Seleccione un técnico"),
  descripcionProblema: z.string().min(1, "Describa el problema reportado").max(500),
  fechaEntregaEstimada: z.string().optional(),
  observaciones: z.string().max(500).optional(),
});

export type OrdenTrabajoFormData = z.infer<typeof ordenTrabajoSchema>;

// --- Terceros ---
export const terceroSchema = z
  .object({
    // Los cuatro tipos que admite el CHECK de la base. "PA" y "TE" salieron:
    // el modelo usa PAS (pasaporte) y no maneja tarjeta de identidad.
    tipoDocumento: z.enum(["CC", "NIT", "CE", "PAS"]),
    numeroDocumento: z.string().min(3, "Mínimo 3 caracteres").max(20),
    nombre: z.string().min(2, "Mínimo 2 caracteres").max(200),
    email: z.union([z.string().email("Email inválido"), z.literal("")]).optional(),
    telefono: z.string().max(40).optional(),
    direccion: z.string().max(200).optional(),
    esCliente: z.boolean(),
    esProveedor: z.boolean(),
    // Si es true, este cliente le retiene a la empresa al facturarle.
    esAgenteRetenedor: z.boolean(),
  })
  // La base tiene el mismo CHECK: no existe un tercero sin rol. Validarlo acá
  // solo sirve para decirlo antes y mejor.
  .refine((t) => t.esCliente || t.esProveedor, {
    message: "Un tercero es cliente, proveedor o las dos cosas. No puede ser ninguna.",
    path: ["esCliente"],
  });

export type TerceroFormData = z.infer<typeof terceroSchema>;

// --- Equipos (listado global) ---
// terceroId va en el schema porque el formulario global selecciona el cliente dueño.
export const equipoSchema = z.object({
  terceroId: z.string().uuid("Seleccione un cliente"),
  tipoEquipo: z.string().min(1, "Requerido").max(50),
  marca: z.string().max(100).optional(),
  modelo: z.string().max(100).optional(),
  serial: z.string().max(100).optional(),
  fechaCompra: z.string().optional(),
});

export type EquipoFormData = z.infer<typeof equipoSchema>;

// --- Contratos de mantenimiento ---
export const contratoSchema = z
  .object({
    terceroId: z.string().uuid("Seleccione un cliente"),
    numero: z.string().min(1, "Requerido").max(20),
    descripcion: z.string().max(500).optional(),
    frecuencia: z.enum(["MENSUAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL"]),
    fechaInicio: z.string().min(1, "Requerido"),
    fechaFin: z.string().optional(),
    proximaVisita: z.string().optional(),
  })
  // Reason: <input type="date"> entrega "YYYY-MM-DD" → comparar strings equivale a cronológico.
  .refine((datos) => !datos.fechaFin || datos.fechaFin >= datos.fechaInicio, {
    message: "La fecha de fin no puede ser anterior al inicio",
    path: ["fechaFin"],
  });

export type ContratoFormData = z.infer<typeof contratoSchema>;

// --- Empleados (RRHH) ---
export const empleadoSchema = z.object({
  nombre: z.string().min(1, "Requerido").max(100),
  apellido: z.string().min(1, "Requerido").max(100),
  tipoIdentificacion: z.enum(["NIT", "CC", "CE", "PASAPORTE", "NIT_EXTRANJERO"]),
  numeroIdentificacion: z.string().min(3, "Mínimo 3 caracteres").max(20),
  cargo: z.string().min(1, "Requerido").max(100),
  salarioBase: z.number({ message: "Requerido" }).min(0, "Inválido"),
  tipoContrato: z.enum([
    "INDEFINIDO",
    "FIJO",
    "OBRA_LABOR",
    "PRESTACION_SERVICIOS",
    "APRENDIZAJE",
  ]),
  fechaIngreso: z.string().min(1, "Requerido"),
  eps: z.string().max(100).optional(),
  afp: z.string().max(100).optional(),
  arl: z.string().max(100).optional(),
  cuentaBancaria: z.string().max(30).optional(),
});

export type EmpleadoFormData = z.infer<typeof empleadoSchema>;

// --- Ausencias ---
export const ausenciaSchema = z
  .object({
    empleadoId: z.string().uuid("Seleccione un empleado"),
    tipo: z.enum([
      "VACACIONES",
      "INCAPACIDAD_GENERAL",
      "INCAPACIDAD_LABORAL",
      "LICENCIA_MATERNIDAD",
      "LICENCIA_PATERNIDAD",
      "LICENCIA_REMUNERADA",
      "LICENCIA_NO_REMUNERADA",
      "CALAMIDAD",
      "PERMISO",
    ]),
    fechaInicio: z.string().min(1, "Requerido"),
    fechaFin: z.string().min(1, "Requerido"),
    diasHabiles: z.number({ message: "Requerido" }).min(0, "Inválido"),
    observaciones: z.string().max(500).optional(),
  })
  .refine((datos) => datos.fechaFin >= datos.fechaInicio, {
    message: "La fecha de fin no puede ser anterior al inicio",
    path: ["fechaFin"],
  });

export type AusenciaFormData = z.infer<typeof ausenciaSchema>;

// --- Nómina ---
export const periodoNominaSchema = z
  .object({
    periodicidad: z.enum(["QUINCENAL", "MENSUAL"]),
    fechaInicio: z.string().min(1, "Requerido"),
    fechaFin: z.string().min(1, "Requerido"),
  })
  .refine((datos) => datos.fechaFin >= datos.fechaInicio, {
    message: "La fecha de fin no puede ser anterior al inicio",
    path: ["fechaFin"],
  });

export type PeriodoNominaFormData = z.infer<typeof periodoNominaSchema>;

// Nota: la línea de nómina se valida con guardas manuales en NominaDetalleView
// (form no-RHF), por eso no hay aquí un lineaNominaSchema.

const MEDIOS_PAGO_VALUES = [
  "EFECTIVO",
  "TRANSFERENCIA",
  "TARJETA",
  "CHEQUE",
  "CONSIGNACION",
  "NEQUI",
  "DAVIPLATA",
] as const;

export const anticipoEmpleadoSchema = z.object({
  empleadoId: z.string().uuid("Seleccione un empleado"),
  monto: z.number({ message: "Requerido" }).positive("El monto debe ser mayor a 0"),
  medioPago: z.enum(MEDIOS_PAGO_VALUES),
  observaciones: z.string().max(255).optional(),
});

export type AnticipoEmpleadoFormData = z.infer<typeof anticipoEmpleadoSchema>;

// --- Caja / Tesorería ---
//
// El turno se cayó con el modelo de 32 tablas: no hay apertura ni fondo inicial
// —el saldo es la suma de `movimiento_caja`— y lo que se cierra es el DÍA. Los
// movimientos a mano tampoco existen: los produce un abono o un arqueo.

/**
 * Cobrar y pagar comparten formulario porque comparten tabla: los dos son un
 * `abono`. El sentido lo decide el nodo desde el que se abre, no el usuario.
 *
 * El tope contra el saldo del documento NO vive acá: el schema no conoce el
 * documento. Lo valida la pantalla, y el backend lo vuelve a validar con la
 * fila ya bloqueada, que es donde el dato es firme.
 */
export const abonoSchema = z.object({
  importe: z.number({ message: "Requerido" }).positive("El importe debe ser mayor a 0"),
  medioPago: z.enum(["EFECTIVO", "TRANSFERENCIA", "TARJETA", "CHEQUE", "OTRO"]),
  fecha: z.string().min(1, "Requerido"),
  referencia: z.string().max(60).optional(),
  observacion: z.string().max(300).optional(),
});

export type AbonoFormData = z.infer<typeof abonoSchema>;

/**
 * El conteo del cajón. La observación es obligatoria cuando no cuadra —un
 * faltante sin explicación es un faltante escondido— pero eso depende del saldo
 * del sistema, que el schema no conoce: lo exige la pantalla con la diferencia
 * ya calculada, igual que el backend.
 */
export const arqueoSchema = z.object({
  fecha: z.string().min(1, "Requerido"),
  saldoContado: z.number({ message: "Requerido" }).min(0, "Inválido"),
  observacion: z.string().max(500).optional(),
});

export type ArqueoFormData = z.infer<typeof arqueoSchema>;

// --- Contabilidad ---
export const periodoContableSchema = z
  .object({
    nombre: z.string().min(3, "Mínimo 3 caracteres").max(50),
    fechaInicio: z.string().min(1, "Requerido"),
    fechaFin: z.string().min(1, "Requerido"),
  })
  .refine((datos) => datos.fechaFin >= datos.fechaInicio, {
    message: "La fecha de fin no puede ser anterior al inicio",
    path: ["fechaFin"],
  });

export type PeriodoContableFormData = z.infer<typeof periodoContableSchema>;

// --- CRM ---
export const tareaSchema = z.object({
  titulo: z.string().min(1, "Requerido").max(255),
  descripcion: z.string().optional(),
  tipo: z.enum(["LLAMADA", "VISITA", "SEGUIMIENTO", "RECORDATORIO", "OTRO"]),
  prioridad: z.enum(["ALTA", "MEDIA", "BAJA"]),
  asignadoAId: z.string().uuid("Seleccione un responsable"),
  terceroId: z.union([z.string().uuid(), z.literal("")]).optional(),
  fechaVencimiento: z.string().optional(),
});

export type TareaFormData = z.infer<typeof tareaSchema>;

export const seguimientoSchema = z.object({
  tipo: z.enum(["POST_VENTA", "POST_OT", "POST_CONTRATO", "GENERAL"]),
  descripcion: z.string().min(1, "Requerido"),
  resultado: z.string().optional(),
  fechaSeguimiento: z.string().min(1, "Requerido"),
  terceroId: z.union([z.string().uuid(), z.literal("")]).optional(),
});

export type SeguimientoFormData = z.infer<typeof seguimientoSchema>;

// --- Configuración / Usuarios ---
const ROLES_VALUES = [
  "VENTAS",
  "COMPRAS",
  "INVENTARIO",
  "CAJA",
  "JEFE_TECNICO",
  "TECNICO",
  "DIRECTOR",
  "CONTADOR",
] as const;

export const usuarioSchema = z.object({
  nombreCompleto: z.string().min(3, "Mínimo 3 caracteres").max(255),
  email: z.string().min(1, "Requerido").email("Email inválido"),
  // Password solo se exige al crear (en edición el campo se omite).
  password: z.string().optional(),
  // VARIOS roles por persona: la cajera lleva cuatro. Los permisos se suman.
  roles: z.array(z.enum(ROLES_VALUES)).min(1, "Asigne al menos un rol"),
});

export type UsuarioFormData = z.infer<typeof usuarioSchema>;

export const resetPasswordSchema = z.object({
  nuevaPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
