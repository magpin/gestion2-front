"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Copy, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { aviso } from "@/lib/avisos";
import { digitoVerificacion } from "@/lib/nit";
import { cn, hoyEnColombia } from "@/lib/utils";
import { dolares, plural } from "../lib/formato";
import { plataformaService } from "../services/plataforma.service";
import {
  NOMBRE_ESTADO,
  NOMBRE_PLAN,
  NOMBRE_ROL,
  PLANES,
  type Cuenta,
  type EmpresaDeCuenta,
  type EstadoCuenta,
  type Exceso,
  type Plan,
} from "../types/plataforma.types";
import { Mono, SinConfigurar } from "./piezas";

/** Lo que el backend manda cuando la cuenta ya usa más de lo que cabe. */
export function excesoDe(error: unknown): Exceso[] | null {
  const datos = (error as { response?: { data?: { exceso?: Exceso[] } } })?.response?.data;
  return Array.isArray(datos?.exceso) ? datos.exceso : null;
}

const refrescar = (qc: ReturnType<typeof useQueryClient>) =>
  qc.invalidateQueries({ queryKey: ["plataforma"] });

const campo =
  "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function Etiqueta({ texto, children, nota }: { texto: string; children: React.ReactNode; nota?: string }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium">{texto}</span>
      {children}
      {nota && <span className="text-xs text-muted-foreground">{nota}</span>}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Contraseña que se muestra una sola vez
// ---------------------------------------------------------------------------

/**
 * La contraseña recién generada, grande y en monoespaciada, para dictarla por
 * teléfono. No se vuelve a mostrar: ni la consola ni el backend la guardan.
 */
export function ContrasenaUnaVez({
  password,
  nombre,
  email,
  titulo = "Contraseña nueva",
  aviso: texto = "Díctela ahora por teléfono o cópiela. La anterior ya no sirve.",
}: {
  password: string;
  nombre?: string;
  email: string;
  titulo?: string;
  aviso?: string;
}) {
  const [copiada, setCopiada] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopiada(true);
      setTimeout(() => setCopiada(false), 2000);
    } catch {
      aviso.error("No se pudo copiar", "Selecciónela y cópiela a mano.");
    }
  };
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">{titulo}</span>
        <span className="text-sm text-muted-foreground">{nombre ? `${nombre}, ${email}` : email}</span>
      </div>
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-4">
        <Mono className="flex-1 select-all text-2xl font-medium tracking-wider">{password}</Mono>
        <Button variant="outline" onClick={copiar}>
          {copiada ? <Check /> : <Copy />}
          {copiada ? "Copiada" : "Copiar"}
        </Button>
      </div>
      <div className="flex gap-3 rounded-lg border border-warning bg-warning/10 p-3 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">Esta contraseña no se vuelve a mostrar.</span>
          <span className="text-muted-foreground">{texto}</span>
        </div>
      </div>
    </div>
  );
}

export function DialogoContrasena({
  datos,
  alCerrar,
}: {
  datos: { password: string; email: string; nombre?: string } | null;
  alCerrar: () => void;
}) {
  return (
    <Dialog open={datos !== null} onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Contraseña nueva</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {datos && <ContrasenaUnaVez password={datos.password} email={datos.email} nombre={datos.nombre} />}
        </DialogBody>
        <DialogFooter>
          <Button onClick={alCerrar}>Listo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Estado de la cuenta
// ---------------------------------------------------------------------------

const MOTIVOS = ["Mora en el pago", "Solicitud del cliente", "Uso indebido", "Otro"];

/**
 * Suspender o cancelar es lo único peligroso de la consola, y se nota: dice
 * qué pasa y pide escribir el nombre de la cuenta para confirmar.
 */
export function DialogoEstado({
  cuenta,
  abierto,
  alCerrar,
}: {
  cuenta: Cuenta;
  abierto: boolean;
  alCerrar: () => void;
}) {
  const qc = useQueryClient();
  const opciones = (Object.keys(NOMBRE_ESTADO) as EstadoCuenta[]).filter((e) => e !== cuenta.estado);
  const [estado, setEstado] = useState<EstadoCuenta>(
    cuenta.estado === "ACTIVO" ? "SUSPENDIDO" : "ACTIVO",
  );
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [otro, setOtro] = useState("");
  const [confirmacion, setConfirmacion] = useState("");

  const peligroso = estado === "SUSPENDIDO" || estado === "CANCELADO";
  const coincide = confirmacion.trim() === cuenta.nombre.trim();
  const textoMotivo = motivo === "Otro" ? otro.trim() : motivo;

  const guardar = useMutation({
    mutationFn: () =>
      plataformaService.cambiarEstado(
        cuenta.id,
        estado,
        peligroso || estado === "MOROSO" ? textoMotivo : undefined,
      ),
    onSuccess: async () => {
      aviso.exito(`${cuenta.nombre} quedó ${NOMBRE_ESTADO[estado].toLowerCase()}`);
      await refrescar(qc);
      alCerrar();
    },
    onError: (e) => aviso.falla(e),
  });

  const puede = !peligroso || (coincide && textoMotivo.length >= 3);

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent>
        <DialogHeader>
          <div>
            <DialogTitle>
              {peligroso
                ? `${estado === "CANCELADO" ? "Cancelar" : "Suspender"} ${cuenta.nombre}`
                : "Cambiar el estado"}
            </DialogTitle>
            <DialogDescription>Hoy está {NOMBRE_ESTADO[cuenta.estado].toLowerCase()}.</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-5">
          <Etiqueta texto="Estado nuevo">
            <select
              className={campo}
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoCuenta)}
            >
              {opciones.map((e) => (
                <option key={e} value={e}>
                  {NOMBRE_ESTADO[e]}
                </option>
              ))}
            </select>
          </Etiqueta>

          {peligroso && (
            <div className="flex flex-col gap-2 rounded-lg border border-danger bg-danger/10 p-4 text-sm">
              <span className="font-medium">
                Qué pasa al {estado === "CANCELADO" ? "cancelar" : "suspender"}
              </span>
              <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
                <li>
                  {cuenta.usuarios === 1 ? "Su único usuario" : `Sus ${cuenta.usuarios} usuarios`}{" "}
                  {estado === "CANCELADO"
                    ? cuenta.usuarios === 1
                      ? "no podrá entrar desde que confirme."
                      : "no podrán entrar desde que confirme."
                    : cuenta.usuarios === 1
                      ? "podrá consultar, pero no emitir documentos."
                      : "podrán consultar, pero no emitir documentos."}
                </li>
                {cuenta.empresas > 0 && (
                  <li>
                    Los datos de {cuenta.empresas === 1 ? "su empresa" : `sus ${cuenta.empresas} empresas`}{" "}
                    se conservan completos.
                  </li>
                )}
                <li>Se puede reactivar desde «Cambiar estado» cuando se resuelva.</li>
              </ul>
            </div>
          )}

          {(peligroso || estado === "MOROSO") && (
            <Etiqueta texto="Motivo">
              <select className={campo} value={motivo} onChange={(e) => setMotivo(e.target.value)}>
                {MOTIVOS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              {motivo === "Otro" && (
                <Input
                  value={otro}
                  onChange={(e) => setOtro(e.target.value)}
                  placeholder="Escriba el motivo"
                  aria-label="Otro motivo"
                />
              )}
            </Etiqueta>
          )}

          {peligroso && (
            <Etiqueta texto="Para confirmar, escriba el nombre de la cuenta">
              <Input
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                placeholder={cuenta.nombre}
                aria-invalid={confirmacion !== "" && !coincide}
                autoComplete="off"
              />
              {confirmacion !== "" && (
                <span className={cn("text-xs", coincide ? "text-success" : "text-muted-foreground")}>
                  {coincide ? "Coincide con el nombre de la cuenta." : "Todavía no coincide."}
                </span>
              )}
            </Etiqueta>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button
            variant={peligroso ? "destructive" : "default"}
            className={peligroso ? "bg-danger text-white hover:bg-danger/90" : undefined}
            disabled={!puede || guardar.isPending}
            onClick={() => guardar.mutate()}
          >
            {guardar.isPending && <Loader2 className="animate-spin" />}
            {estado === "SUSPENDIDO"
              ? "Suspender la cuenta"
              : estado === "CANCELADO"
                ? "Cancelar la cuenta"
                : `Pasar a ${NOMBRE_ESTADO[estado].toLowerCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

/** El plan nuevo trae sus cupos: la comparación dice qué cambia antes de confirmar. */
export function DialogoPlan({
  cuenta,
  iaMesUsd,
  abierto,
  alCerrar,
}: {
  cuenta: Cuenta;
  iaMesUsd: number;
  abierto: boolean;
  alCerrar: () => void;
}) {
  const qc = useQueryClient();
  const planes = useQuery({
    queryKey: ["plataforma", "planes"],
    queryFn: plataformaService.planes,
    enabled: abierto,
  });
  const [plan, setPlan] = useState<Plan>(
    PLANES.find((p) => p !== cuenta.plan) ?? "PROFESIONAL",
  );

  const actual = planes.data?.find((p) => p.clave === cuenta.plan);
  const nuevo = planes.data?.find((p) => p.clave === plan);
  const exceso =
    nuevo === undefined
      ? []
      : [
          ...(cuenta.empresas > nuevo.maxEmpresas
            ? [`${plural(cuenta.empresas, "empresa")}, y el plan permite ${nuevo.maxEmpresas}`]
            : []),
          ...(cuenta.usuarios > nuevo.maxUsuarios
            ? [`${plural(cuenta.usuarios, "usuario")}, y el plan permite ${nuevo.maxUsuarios}`]
            : []),
        ];

  const guardar = useMutation({
    mutationFn: () => plataformaService.cambiarPlan(cuenta.id, plan, exceso.length > 0),
    onSuccess: async () => {
      aviso.exito(`${cuenta.nombre} pasó a ${NOMBRE_PLAN[plan]}`);
      await refrescar(qc);
      alCerrar();
    },
    onError: (e) => aviso.falla(e),
  });

  const filas: { texto: string; hoy: React.ReactNode; nuevo: React.ReactNode; usa: string }[] =
    actual && nuevo
      ? [
          {
            texto: "Precio mensual",
            hoy: <SinConfigurar texto="—" />,
            nuevo: <SinConfigurar texto="—" />,
            usa: "",
          },
          {
            texto: "Empresas",
            hoy: cuenta.maxEmpresas,
            nuevo: nuevo.maxEmpresas,
            usa: `Usa ${cuenta.empresas}`,
          },
          {
            texto: "Usuarios",
            hoy: cuenta.maxUsuarios,
            nuevo: nuevo.maxUsuarios,
            usa: `Usa ${cuenta.usuarios}`,
          },
          {
            texto: "Tope de IA",
            hoy: actual.topeIaUsd === null ? <SinConfigurar texto="—" /> : dolares(actual.topeIaUsd),
            nuevo: nuevo.topeIaUsd === null ? <SinConfigurar texto="—" /> : dolares(nuevo.topeIaUsd),
            usa: `Lleva ${dolares(iaMesUsd)}`,
          },
        ]
      : [];

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent>
        <DialogHeader>
          <div>
            <DialogTitle>Cambiar el plan</DialogTitle>
            <DialogDescription>
              {cuenta.nombre}, hoy en {NOMBRE_PLAN[cuenta.plan]}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-5">
          <Etiqueta texto="Plan nuevo">
            <select className={campo} value={plan} onChange={(e) => setPlan(e.target.value as Plan)}>
              {PLANES.filter((p) => p !== cuenta.plan).map((p) => (
                <option key={p} value={p}>
                  {NOMBRE_PLAN[p]}
                </option>
              ))}
            </select>
          </Etiqueta>

          {planes.isPending ? (
            <div className="flex justify-center py-6 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="border-b border-border py-2 text-left font-medium" />
                  <th className="border-b border-border py-2 text-right font-medium">
                    {NOMBRE_PLAN[cuenta.plan]}
                  </th>
                  <th className="border-b border-border py-2 text-right font-medium">{NOMBRE_PLAN[plan]}</th>
                  <th className="border-b border-border py-2 text-right font-medium">Hoy</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.texto}>
                    <td className="border-b border-border py-2">{f.texto}</td>
                    <td className="border-b border-border py-2 text-right">
                      <Mono>{f.hoy}</Mono>
                    </td>
                    <td className="border-b border-border py-2 text-right font-medium">
                      <Mono>{f.nuevo}</Mono>
                    </td>
                    <td className="border-b border-border py-2 text-right text-muted-foreground">{f.usa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {exceso.length > 0 && (
            <div className="flex gap-3 rounded-lg border border-warning bg-warning/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">
                  La cuenta usa más de lo que permite {NOMBRE_PLAN[plan]}.
                </span>
                <span className="text-muted-foreground">
                  {exceso.join(". ")}. Lo que ya existe sigue, pero no podrá crear más.
                </span>
              </div>
            </div>
          )}
          <p className="m-0 text-xs text-muted-foreground">
            Los cupos cambian a los del plan nuevo. Se pueden ajustar después, uno por uno.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button disabled={guardar.isPending || !nuevo} onClick={() => guardar.mutate()}>
            {guardar.isPending && <Loader2 className="animate-spin" />}
            Cambiar a {NOMBRE_PLAN[plan]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Cupos
// ---------------------------------------------------------------------------

export function DialogoCupos({
  cuenta,
  abierto,
  alCerrar,
}: {
  cuenta: Cuenta;
  abierto: boolean;
  alCerrar: () => void;
}) {
  const qc = useQueryClient();
  const [empresas, setEmpresas] = useState(String(cuenta.maxEmpresas));
  const [usuarios, setUsuarios] = useState(String(cuenta.maxUsuarios));
  const e = Number(empresas);
  const u = Number(usuarios);
  const valido =
    Number.isInteger(e) && Number.isInteger(u) && e >= Math.max(1, cuenta.empresas) && u >= Math.max(1, cuenta.usuarios);

  const guardar = useMutation({
    mutationFn: () => plataformaService.ajustarCupos(cuenta.id, { maxEmpresas: e, maxUsuarios: u }),
    onSuccess: async () => {
      aviso.exito("Cupos ajustados");
      await refrescar(qc);
      alCerrar();
    },
    onError: (err) => aviso.falla(err),
  });

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent>
        <DialogHeader>
          <div>
            <DialogTitle>Ajustar cupos</DialogTitle>
            <DialogDescription>
              Solo para {cuenta.nombre}. El plan {NOMBRE_PLAN[cuenta.plan]} no cambia.
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="grid gap-5 sm:grid-cols-2">
          <Etiqueta texto="Cupo de empresas" nota={`Usa ${cuenta.empresas}. No puede quedar por debajo.`}>
            <Input
              type="number"
              min={Math.max(1, cuenta.empresas)}
              value={empresas}
              onChange={(ev) => setEmpresas(ev.target.value)}
            />
          </Etiqueta>
          <Etiqueta texto="Cupo de usuarios" nota={`Usa ${cuenta.usuarios}. No puede quedar por debajo.`}>
            <Input
              type="number"
              min={Math.max(1, cuenta.usuarios)}
              value={usuarios}
              onChange={(ev) => setUsuarios(ev.target.value)}
            />
          </Etiqueta>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button disabled={!valido || guardar.isPending} onClick={() => guardar.mutate()}>
            {guardar.isPending && <Loader2 className="animate-spin" />}
            Guardar cupos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Agregar empresa
// ---------------------------------------------------------------------------

const SECTORES = [
  ["COMERCIO", "Comercio"],
  ["SERVICIOS", "Servicios"],
  ["MANUFACTURA", "Manufactura"],
] as const;

/**
 * Una salida de soporte: lo normal es que el director cree su empresa desde el
 * asistente. El dígito de verificación no se pregunta: sale del NIT.
 */
export function DialogoEmpresa({
  cuenta,
  abierto,
  alCerrar,
}: {
  cuenta: Cuenta;
  abierto: boolean;
  alCerrar: () => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    tipoPersona: "JURIDICA",
    razonSocial: "",
    nit: "",
    grupoNiif: "GRUPO_2",
    fechaInicioOperaciones: hoyEnColombia(),
    sectores: [] as string[],
  });
  const dv = digitoVerificacion(f.nit);
  const lleno = f.razonSocial.trim().length >= 3 && /^\d{5,15}$/.test(f.nit) && dv !== "";
  const sinCupo = cuenta.empresas >= cuenta.maxEmpresas;

  const guardar = useMutation({
    mutationFn: () => plataformaService.crearEmpresa(cuenta.id, { ...f, razonSocial: f.razonSocial.trim(), dv }),
    onSuccess: async () => {
      aviso.exito(`${f.razonSocial.trim()} quedó creada`, "Su administrador ya puede entrar a configurarla.");
      await refrescar(qc);
      alCerrar();
    },
    onError: (e) => aviso.falla(e),
  });

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent size="lg">
        <DialogHeader>
          <div>
            <DialogTitle>Agregar empresa</DialogTitle>
            <DialogDescription>
              En {cuenta.nombre}. Lo normal es que la cree su director desde el asistente; esto es para
              cuando no puede.
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="grid gap-5 sm:grid-cols-2">
          {sinCupo && (
            <p className="m-0 rounded-lg border border-warning bg-warning/10 p-3 text-sm sm:col-span-2">
              La cuenta ya usa sus {cuenta.maxEmpresas} empresas. Ajuste el cupo primero.
            </p>
          )}
          <Etiqueta texto="Tipo de persona">
            <select
              className={campo}
              value={f.tipoPersona}
              onChange={(e) => setF({ ...f, tipoPersona: e.target.value })}
            >
              <option value="JURIDICA">Jurídica</option>
              <option value="NATURAL">Natural</option>
            </select>
          </Etiqueta>
          <Etiqueta texto="Razón social">
            <Input value={f.razonSocial} onChange={(e) => setF({ ...f, razonSocial: e.target.value })} />
          </Etiqueta>
          <Etiqueta texto="NIT" nota={dv ? `Dígito de verificación: ${dv}` : "Sin puntos ni dígito de verificación."}>
            <Input
              inputMode="numeric"
              value={f.nit}
              onChange={(e) => setF({ ...f, nit: e.target.value.replace(/\D/g, "") })}
            />
          </Etiqueta>
          <Etiqueta texto="Grupo NIIF">
            <select
              className={campo}
              value={f.grupoNiif}
              onChange={(e) => setF({ ...f, grupoNiif: e.target.value })}
            >
              <option value="GRUPO_1">Grupo 1</option>
              <option value="GRUPO_2">Grupo 2</option>
              <option value="GRUPO_3">Grupo 3</option>
            </select>
          </Etiqueta>
          <Etiqueta texto="Inicio de operaciones">
            <Input
              type="date"
              value={f.fechaInicioOperaciones}
              onChange={(e) => setF({ ...f, fechaInicioOperaciones: e.target.value })}
            />
          </Etiqueta>
          <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0 text-sm">
            <legend className="mb-1.5 font-medium">Sectores</legend>
            <div className="flex flex-wrap gap-4">
              {SECTORES.map(([valor, texto]) => (
                <label key={valor} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="size-4 accent-foreground"
                    checked={f.sectores.includes(valor)}
                    onChange={(e) =>
                      setF({
                        ...f,
                        sectores: e.target.checked
                          ? [...f.sectores, valor]
                          : f.sectores.filter((s) => s !== valor),
                      })
                    }
                  />
                  {texto}
                </label>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">Opcional: lo puede marcar el director.</span>
          </fieldset>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button disabled={!lleno || sinCupo || guardar.isPending} onClick={() => guardar.mutate()}>
            {guardar.isPending && <Loader2 className="animate-spin" />}
            Crear la empresa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Agregar usuario
// ---------------------------------------------------------------------------

const ROLES = ["DIRECTOR", "CONTADOR", "VENTAS", "COMPRAS", "INVENTARIO", "CAJA", "CONSULTA"];

export function DialogoUsuario({
  cuenta,
  empresas,
  abierto,
  alCerrar,
  alCrear,
}: {
  cuenta: Cuenta;
  empresas: EmpresaDeCuenta[];
  abierto: boolean;
  alCerrar: () => void;
  alCrear: (d: { password: string; email: string; nombre: string }) => void;
}) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    nombreCompleto: "",
    email: "",
    esAdminCuenta: false,
    empresaId: empresas[0]?.id ?? "",
    rol: "CONSULTA",
  });
  const sinCupo = cuenta.usuarios >= cuenta.maxUsuarios;
  const lleno = f.nombreCompleto.trim().length >= 3 && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(f.email.trim());

  const guardar = useMutation({
    mutationFn: () =>
      plataformaService.crearUsuario(cuenta.id, {
        nombreCompleto: f.nombreCompleto.trim(),
        email: f.email.trim(),
        esAdminCuenta: f.esAdminCuenta,
        ...(f.empresaId ? { empresaId: f.empresaId, rol: f.rol } : {}),
      }),
    onSuccess: async (r) => {
      await refrescar(qc);
      alCerrar();
      if (r.password) alCrear({ password: r.password, email: r.email, nombre: f.nombreCompleto.trim() });
    },
    onError: (e) => aviso.falla(e),
  });

  return (
    <Dialog open={abierto} onOpenChange={(o) => !o && alCerrar()}>
      <DialogContent size="lg">
        <DialogHeader>
          <div>
            <DialogTitle>Agregar usuario</DialogTitle>
            <DialogDescription>
              En {cuenta.nombre}. La contraseña se genera y se muestra una sola vez.
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="grid gap-5 sm:grid-cols-2">
          {sinCupo && (
            <p className="m-0 rounded-lg border border-warning bg-warning/10 p-3 text-sm sm:col-span-2">
              La cuenta ya usa sus {cuenta.maxUsuarios} usuarios. Ajuste el cupo primero.
            </p>
          )}
          <Etiqueta texto="Nombre completo">
            <Input value={f.nombreCompleto} onChange={(e) => setF({ ...f, nombreCompleto: e.target.value })} />
          </Etiqueta>
          <Etiqueta texto="Correo">
            <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </Etiqueta>
          <Etiqueta texto="Empresa" nota="Opcional: sin empresa, el usuario entra pero no ve ninguna.">
            <select
              className={campo}
              value={f.empresaId}
              onChange={(e) => setF({ ...f, empresaId: e.target.value })}
            >
              <option value="">Ninguna por ahora</option>
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.razonSocial}
                </option>
              ))}
            </select>
          </Etiqueta>
          <Etiqueta texto="Rol en esa empresa">
            <select
              className={campo}
              value={f.rol}
              disabled={!f.empresaId}
              onChange={(e) => setF({ ...f, rol: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {NOMBRE_ROL[r]}
                </option>
              ))}
            </select>
          </Etiqueta>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              className="size-4 accent-foreground"
              checked={f.esAdminCuenta}
              onChange={(e) => setF({ ...f, esAdminCuenta: e.target.checked })}
            />
            Administrador de la cuenta: crea empresas, invita usuarios y gestiona la suscripción.
          </label>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button disabled={!lleno || sinCupo || guardar.isPending} onClick={() => guardar.mutate()}>
            {guardar.isPending && <Loader2 className="animate-spin" />}
            Crear el usuario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
