"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  GitCompareArrows,
  History,
  Landmark,
  ListFilter,
  Loader2,
  Settings2,
} from "lucide-react";

import { BotonNuevo } from "@/components/shared/BotonNuevo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogCloseIcon,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCOP } from "@/lib/utils";
import { aviso } from "@/lib/avisos";
import { useTieneRol } from "@/core/store/authStore";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";
import { FormularioCaja, type DatosCaja } from "../components/FormularioCaja";
import {
  FormularioCuentaBancaria,
  type DatosCuentaBancaria,
} from "../components/FormularioCuentaBancaria";
import { cuentasBancariasApi } from "../services/bancos.service";
import { cajasApi } from "../services/tesoreria.service";
import { NOMBRE_TIPO_CAJA } from "../types/tesoreria.types";
import { ArqueoSeccion } from "./ArqueoSeccion";
import { CajasSeccion } from "./CajasSeccion";
import { ConciliacionSeccion } from "./ConciliacionSeccion";
import { CorteBancoSeccion } from "./CorteBancoSeccion";
import { ConfiguracionSeccion } from "./ConfiguracionSeccion";
import { CuentasBancariasSeccion } from "./CuentasBancariasSeccion";
import { ExtractosSeccion } from "./ExtractosSeccion";
import { LibroBancoSeccion } from "./LibroBancoSeccion";
import { LibroCajaSeccion } from "./LibroCajaSeccion";
import { ReglasExtractoSeccion } from "./ReglasExtractoSeccion";

type Grupo = "Caja" | "Bancos";
type SeccionCaja = "Cajas" | "Libro" | "Arqueo" | "Configuración";
type SeccionBanco =
  | "Cuentas"
  | "Libro"
  | "Corte diario"
  | "Extractos"
  | "Conciliación"
  | "Reglas";

const SECCIONES_CAJA: Array<[SeccionCaja, typeof Landmark]> = [
  ["Cajas", Landmark],
  ["Libro", History],
  ["Arqueo", ClipboardCheck],
  ["Configuración", Settings2],
];

const SECCIONES_BANCO: Array<[SeccionBanco, typeof Landmark]> = [
  ["Cuentas", Landmark],
  ["Libro", History],
  ["Corte diario", CalendarCheck],
  ["Extractos", FileText],
  ["Conciliación", GitCompareArrows],
  ["Reglas", ListFilter],
];

const ID_FORMULARIO_CAJA = "formulario-nueva-caja";
const ID_FORMULARIO_CUENTA_BANCARIA = "formulario-nueva-cuenta-bancaria";

/**
 * Tesorería — módulo 7 de la secuencia: Caja y Bancos, las dos partes de
 * un mismo módulo, no dos vistas ni dos rutas. `grupo` elige cuál de las
 * dos; cada uno tiene su propia fila de sub-pestañas — mezclar las 8 en
 * una sola fila las hacía ilegibles.
 *
 * El botón de alta del encabezado cambia según dónde se esté parado:
 * "Nueva caja" en Caja/Cajas, "Nueva cuenta bancaria" en Bancos/Cuentas,
 * oculto en el resto — es la acción de esa pantalla puntual, no un botón
 * genérico.
 */
export function TesoreriaView() {
  const queryClient = useQueryClient();
  const puedeCrear = useTieneRol("CAJA", "DIRECTOR");

  const [grupo, setGrupo] = useState<Grupo>("Caja");
  const [seccionCaja, setSeccionCaja] = useState<SeccionCaja>("Cajas");
  const [seccionBanco, setSeccionBanco] = useState<SeccionBanco>("Cuentas");

  const [creandoCaja, setCreandoCaja] = useState(false);
  const [cuentaCaja, setCuentaCaja] = useState<CuentaEmpresa | null>(null);
  const [creandoCuentaBancaria, setCreandoCuentaBancaria] = useState(false);
  const [cuentaContableBanco, setCuentaContableBanco] = useState<CuentaEmpresa | null>(null);

  const crearCaja = useMutation({
    mutationFn: (d: DatosCaja) =>
      cajasApi.crear({
        nombre: d.nombre,
        tipo: d.tipo,
        sedeId: d.tipo === "PRINCIPAL" ? d.sedeId : undefined,
        cuentaId: d.cuentaId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cajas"] });
      aviso.exito("Caja registrada");
      setCreandoCaja(false);
      setCuentaCaja(null);
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const crearCuentaBancaria = useMutation({
    mutationFn: (d: DatosCuentaBancaria) => cuentasBancariasApi.crear(d),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["cuentas-bancarias"] });
      aviso.exito("Cuenta bancaria registrada");
      setCreandoCuentaBancaria(false);
      setCuentaContableBanco(null);
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const mostrarNuevaCaja = grupo === "Caja" && seccionCaja === "Cajas";
  const mostrarNuevaCuentaBancaria = grupo === "Bancos" && seccionBanco === "Cuentas";

  return (
    <div className="mx-auto w-full max-w-[1240px] px-5 py-7 sm:px-10 lg:px-16">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-text">
            <span className="size-2 rounded-full bg-brand" />
            Tesorería
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em]">
            {grupo}
            <span className="text-brand">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {grupo === "Caja"
              ? "El efectivo de la empresa: sus cajas, el libro de movimientos y el cuadre diario."
              : "Las cuentas bancarias, su libro y la conciliación contra el extracto."}
          </p>
        </div>

        {puedeCrear && mostrarNuevaCaja && (
          <BotonNuevo etiqueta="Nueva caja" onClick={() => setCreandoCaja(true)} />
        )}
        {puedeCrear && mostrarNuevaCuentaBancaria && (
          <BotonNuevo
            etiqueta="Nueva cuenta bancaria"
            onClick={() => setCreandoCuentaBancaria(true)}
          />
        )}
      </header>

      <div className="mb-5 inline-flex gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm">
        {(["Caja", "Bancos"] as const).map((g) => (
          <button
            key={g}
            type="button"
            aria-current={grupo === g ? "page" : undefined}
            onClick={() => setGrupo(g)}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors ${
              grupo === g ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {g === "Caja" ? <Landmark className="size-4" /> : <Banknote className="size-4" />}
            {g}
          </button>
        ))}
      </div>

      {grupo === "Caja" ? (
        <nav className="mb-7 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
          {SECCIONES_CAJA.map(([nombre, Icono]) => (
            <button
              key={nombre}
              type="button"
              aria-current={seccionCaja === nombre ? "page" : undefined}
              onClick={() => setSeccionCaja(nombre)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                seccionCaja === nombre ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <Icono className="size-4" />
              {nombre}
            </button>
          ))}
        </nav>
      ) : (
        <nav className="mb-7 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
          {SECCIONES_BANCO.map(([nombre, Icono]) => (
            <button
              key={nombre}
              type="button"
              aria-current={seccionBanco === nombre ? "page" : undefined}
              onClick={() => setSeccionBanco(nombre)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                seccionBanco === nombre ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <Icono className="size-4" />
              {nombre}
            </button>
          ))}
        </nav>
      )}

      <Saldos grupo={grupo} />

      {grupo === "Caja" && (
        <>
          {seccionCaja === "Cajas" && <CajasSeccion />}
          {seccionCaja === "Libro" && <LibroCajaSeccion />}
          {seccionCaja === "Arqueo" && <ArqueoSeccion />}
          {seccionCaja === "Configuración" && <ConfiguracionSeccion />}
        </>
      )}
      {grupo === "Bancos" && (
        <>
          {seccionBanco === "Cuentas" && <CuentasBancariasSeccion />}
          {seccionBanco === "Libro" && <LibroBancoSeccion />}
          {seccionBanco === "Corte diario" && <CorteBancoSeccion />}
          {seccionBanco === "Extractos" && <ExtractosSeccion />}
          {seccionBanco === "Conciliación" && <ConciliacionSeccion />}
          {seccionBanco === "Reglas" && <ReglasExtractoSeccion />}
        </>
      )}

      <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground print:hidden">
        <Landmark className="size-3.5 text-success" />
        {grupo === "Caja"
          ? "Las cajas no se eliminan: se desactivan para conservar su libro."
          : "Las cuentas bancarias no se eliminan: se desactivan para conservar su libro."}
      </p>

      <Dialog open={creandoCaja} onOpenChange={(a) => !a && setCreandoCaja(false)}>
        <DialogContent size="lg">
          <DialogHeader>
            <div>
              <DialogTitle>Nueva caja</DialogTitle>
              <DialogDescription>Una por sede (arqueo por punto de venta), o el fondo fijo de caja menor.</DialogDescription>
            </div>
            <DialogCloseIcon />
          </DialogHeader>
          <DialogBody>
            <FormularioCaja
              id={ID_FORMULARIO_CAJA}
              cuenta={cuentaCaja}
              onCuenta={setCuentaCaja}
              alGuardar={(d) => crearCaja.mutate(d)}
            />
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl px-6"
              onClick={() => {
                setCreandoCaja(false);
                setCuentaCaja(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" form={ID_FORMULARIO_CAJA} className="h-12 rounded-xl px-6" disabled={crearCaja.isPending}>
              {crearCaja.isPending && <Loader2 className="size-4 animate-spin" />}
              Guardar caja
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={creandoCuentaBancaria} onOpenChange={(a) => !a && setCreandoCuentaBancaria(false)}>
        <DialogContent size="lg">
          <DialogHeader>
            <div>
              <DialogTitle>Nueva cuenta bancaria</DialogTitle>
              <DialogDescription>Un auxiliar propio del plan de cuentas, uno por cuenta bancaria.</DialogDescription>
            </div>
            <DialogCloseIcon />
          </DialogHeader>
          <DialogBody>
            <FormularioCuentaBancaria
              id={ID_FORMULARIO_CUENTA_BANCARIA}
              cuenta={cuentaContableBanco}
              onCuenta={setCuentaContableBanco}
              alGuardar={(d) => crearCuentaBancaria.mutate(d)}
            />
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="h-12 rounded-xl px-6"
              onClick={() => {
                setCreandoCuentaBancaria(false);
                setCuentaContableBanco(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form={ID_FORMULARIO_CUENTA_BANCARIA}
              className="h-12 rounded-xl px-6"
              disabled={crearCuentaBancaria.isPending}
            >
              {crearCuentaBancaria.isPending && <Loader2 className="size-4 animate-spin" />}
              Guardar cuenta bancaria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Cuánta plata hay, en números y debajo de las pestañas.
 *
 * Muestra **solo lo del grupo abierto**: parado en Caja, las cajas; en Bancos,
 * las cuentas. Mezclar los dos obligaba a buscar cuál de los renglones era el
 * que importaba, y el módulo ya se divide en dos por algo.
 *
 * Suma en el cliente porque las dos listas vienen completas —una empresa tiene
 * pocas cajas y pocas cuentas—; el saldo de cada una lo calcula la API sobre
 * su último movimiento, que es la única fuente de esa verdad.
 */
function Saldos({ grupo }: { grupo: Grupo }) {
  const esCaja = grupo === "Caja";

  const { data: cajas } = useQuery({
    queryKey: ["cajas"],
    queryFn: () => cajasApi.listar(),
    enabled: esCaja,
  });
  const { data: cuentas } = useQuery({
    queryKey: ["cuentas-bancarias"],
    queryFn: () => cuentasBancariasApi.listar(),
    enabled: !esCaja,
  });

  const renglones = esCaja
    ? (cajas ?? []).map((c) => ({
        id: c.id,
        nombre: c.nombre,
        detalle: NOMBRE_TIPO_CAJA[c.tipo],
        saldo: Number(c.saldo),
      }))
    : (cuentas ?? []).map((c) => ({
        id: c.id,
        nombre: c.banco,
        detalle: c.numero_cuenta,
        saldo: Number(c.saldo),
      }));

  if (renglones.length === 0) return null;

  const total = renglones.reduce((t, r) => t + r.saldo, 0);

  return (
    <section className="mb-7 rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-5 px-6 py-5">
        <Cifra
          etiqueta={esCaja ? "Total en caja" : "Total en bancos"}
          valor={total}
          destacada
        />
        <p className="text-sm text-muted-foreground">
          {renglones.length} {esCaja ? "caja" : "cuenta"}
          {renglones.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Cada caja o cuenta con lo suyo. Con una sola, el desglose repetiría
          el total y no se muestra. */}
      {renglones.length > 1 && (
        <div className="grid gap-px border-t border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {renglones.map((r) => (
            <div key={r.id} className="bg-card px-6 py-4">
              <p className="truncate text-sm font-semibold">{r.nombre}</p>
              <p className="text-xs text-muted-foreground">{r.detalle}</p>
              <p
                className={`mt-1 font-mono text-lg font-semibold tabular-nums ${
                  r.saldo < 0 ? "text-danger" : ""
                }`}
              >
                {formatCOP(r.saldo)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Cifra({
  etiqueta,
  valor,
  destacada = false,
}: {
  etiqueta: string;
  valor: number;
  destacada?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {etiqueta}
      </p>
      {/* En rojo cuando está en negativo: el banco admite sobregiro, y un
          saldo negativo tiene que verse como lo que es. */}
      <p
        className={`font-mono font-semibold tabular-nums ${
          destacada ? "text-3xl tracking-[-0.03em]" : "text-2xl"
        } ${valor < 0 ? "text-danger" : ""}`}
      >
        {formatCOP(valor)}
      </p>
    </div>
  );
}
