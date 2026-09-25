"use client";

import { useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { CampoPesos } from "@/components/shared/CampoNumero";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Campo } from "@/modules/configuracion/components/Campo";
import { Aviso } from "@/components/shared/Aviso";
import { cn, formatCOP } from "@/lib/utils";
import { SelectorTercero } from "@/modules/ventas/components/SelectorTercero";
import type { TerceroResumen } from "@/modules/terceros/types/terceros.types";
import type {
  ArqueoResumen,
  CajaResumen,
  CerrarArqueoInput,
  TratamientoFaltante,
} from "../types/tesoreria.types";

const CONTROL = "h-11 rounded-xl px-4";
const hoy = () => new Date().toISOString().slice(0, 10);

const esquemaAbrir = z.object({
  fecha: z.string().min(1, "Requerido"),
  nota: z.string().max(300).optional(),
});
export type DatosAbrirArqueo = z.infer<typeof esquemaAbrir>;

/** Abre el arqueo del día. El saldo del sistema lo congela el backend, no acá. */
export function FormularioAbrirArqueo({
  id,
  alGuardar,
}: {
  id: string;
  alGuardar: (datos: DatosAbrirArqueo) => void;
}) {
  const form = useForm<DatosAbrirArqueo>({
    resolver: zodResolver(esquemaAbrir),
    defaultValues: { fecha: hoy(), nota: "" },
  });
  const errores = form.formState.errors;

  return (
    <form id={id} className="flex flex-col gap-5" onSubmit={form.handleSubmit(alGuardar)}>
      <Campo id="fecha" etiqueta="Fecha *" error={errores.fecha?.message} escala="grande">
        <Input id="fecha" type="date" className={CONTROL} {...form.register("fecha")} />
      </Campo>
      <Campo id="nota" etiqueta="Nota" escala="grande">
        <Textarea id="nota" className="min-h-20 rounded-xl px-4 py-3" placeholder="Opcional" {...form.register("nota")} />
      </Campo>
    </form>
  );
}

/**
 * Los billetes y monedas de peso colombiano. Espejo de `DENOMINACIONES_COP`
 * del backend, que es quien valida: si el Banco de la República emite uno
 * nuevo, se agrega en los dos lados.
 */
const DENOMINACIONES = {
  BILLETE: [100_000, 50_000, 20_000, 10_000, 5_000, 2_000, 1_000],
  MONEDA: [1_000, 500, 200, 100, 50],
} as const;

type TipoDenominacion = keyof typeof DENOMINACIONES;
const clave = (tipo: TipoDenominacion, valor: number) => `${tipo}-${valor}`;

export type DatosCerrarArqueo = CerrarArqueoInput;

/**
 * Cierra el arqueo abierto de una caja. El saldo del sistema va en modo
 * lectura —lo congeló `abrir`, no se recalcula acá— y la diferencia se ve
 * en vivo a medida que se cuenta: positiva es sobrante, negativa es
 * faltante, mismo signo que `calcularDiferenciaArqueo` del backend.
 *
 * Se cuenta billete por billete por defecto: un total digitado no deja ver
 * dónde estuvo el error, y el detalle queda guardado con el arqueo. El total
 * a secas sigue disponible para quien ya contó en papel.
 */
export function FormularioCerrarArqueo({
  id,
  arqueo,
  caja,
  alGuardar,
}: {
  id: string;
  arqueo: ArqueoResumen;
  /** Trae al responsable: a quién se le cobra un faltante si nadie dice otra cosa. */
  caja: CajaResumen;
  alGuardar: (datos: DatosCerrarArqueo) => void;
}) {
  const [modo, setModo] = useState<"DENOMINACIONES" | "TOTAL">("DENOMINACIONES");
  const [cantidades, setCantidades] = useState<Record<string, string>>({});
  const [total, setTotal] = useState("");
  const [nota, setNota] = useState("");
  // Qué pasa con un faltante lo sabe quien cerró la caja, no el sistema: por
  // eso no viene elegido.
  const [tratamiento, setTratamiento] = useState<TratamientoFaltante | null>(null);
  const [responsable, setResponsable] = useState<TerceroResumen | null>(
    caja.responsable === null
      ? null
      : ({ ...caja.responsable } as TerceroResumen),
  );
  const [intento, setIntento] = useState(false);

  const cantidadDe = (tipo: TipoDenominacion, valor: number) => {
    const n = Number(cantidades[clave(tipo, valor)] || 0);
    return Number.isInteger(n) && n >= 0 ? n : NaN;
  };

  const conteoInvalido = (Object.keys(DENOMINACIONES) as TipoDenominacion[]).some((tipo) =>
    DENOMINACIONES[tipo].some((v) => Number.isNaN(cantidadDe(tipo, v))),
  );
  const sumaConteo = (Object.keys(DENOMINACIONES) as TipoDenominacion[]).reduce(
    (t, tipo) =>
      t + DENOMINACIONES[tipo].reduce((s, v) => s + v * (cantidadDe(tipo, v) || 0), 0),
    0,
  );

  const contado = modo === "DENOMINACIONES" ? sumaConteo : Number(total || 0);
  const diferencia = contado - Number(arqueo.saldo_sistema);
  const totalInvalido = modo === "TOTAL" && (total.trim() === "" || !(Number(total) >= 0));

  const faltante = diferencia < 0;
  const faltaTratamiento = faltante && tratamiento === null;
  const faltaResponsable = faltante && tratamiento === "RESPONSABLE" && responsable === null;

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    setIntento(true);
    if (faltaTratamiento || faltaResponsable) return;
    // Solo un faltante lleva tratamiento; con sobrante el backend lo ignora
    // igual, pero no tiene sentido mandarlo.
    const decision: Pick<CerrarArqueoInput, "tratamientoFaltante" | "responsableTerceroId"> =
      faltante && tratamiento !== null
        ? {
            tratamientoFaltante: tratamiento,
            responsableTerceroId:
              tratamiento === "RESPONSABLE" ? responsable?.id : undefined,
          }
        : {};
    if (modo === "DENOMINACIONES") {
      if (conteoInvalido) return;
      alGuardar({
        denominaciones: (Object.keys(DENOMINACIONES) as TipoDenominacion[]).flatMap((tipo) =>
          DENOMINACIONES[tipo]
            .map((v) => ({ tipo, denominacion: v, cantidad: cantidadDe(tipo, v) }))
            .filter((d) => d.cantidad > 0),
        ),
        nota: nota || undefined,
        ...decision,
      });
    } else {
      if (totalInvalido) return;
      alGuardar({ saldoContado: Number(total), nota: nota || undefined, ...decision });
    }
  };

  return (
    <form id={id} className="flex flex-col gap-5" onSubmit={enviar}>
      <p className="rounded-2xl bg-muted p-4 text-sm">
        Saldo del sistema: <span className="font-mono font-semibold">{formatCOP(Number(arqueo.saldo_sistema))}</span>
      </p>

      <div className="inline-flex w-fit gap-1 rounded-2xl border border-border bg-muted p-1" role="radiogroup">
        {(
          [
            ["DENOMINACIONES", "Billete por billete"],
            ["TOTAL", "Solo el total"],
          ] as const
        ).map(([m, etiqueta]) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={modo === m}
            onClick={() => setModo(m)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
              modo === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
            )}
          >
            {etiqueta}
          </button>
        ))}
      </div>

      {modo === "DENOMINACIONES" ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {(Object.keys(DENOMINACIONES) as TipoDenominacion[]).map((tipo) => (
            <fieldset key={tipo} className="flex flex-col gap-2">
              <legend className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {tipo === "BILLETE" ? "Billetes" : "Monedas"}
              </legend>
              {DENOMINACIONES[tipo].map((v) => {
                const n = cantidadDe(tipo, v);
                return (
                  <div key={v} className="grid grid-cols-[90px_80px_1fr] items-center gap-3">
                    <label htmlFor={clave(tipo, v)} className="font-mono text-sm font-semibold">
                      {formatCOP(v)}
                    </label>
                    <Input
                      id={clave(tipo, v)}
                      type="number"
                      min="0"
                      step="1"
                      inputMode="numeric"
                      placeholder="0"
                      value={cantidades[clave(tipo, v)] ?? ""}
                      onChange={(e) =>
                        setCantidades((c) => ({ ...c, [clave(tipo, v)]: e.target.value }))
                      }
                      className={cn("h-10 rounded-xl px-3 text-right font-mono", Number.isNaN(n) && "border-danger")}
                    />
                    <span className="text-right font-mono text-sm text-muted-foreground">
                      {n > 0 ? formatCOP(v * n) : ""}
                    </span>
                  </div>
                );
              })}
            </fieldset>
          ))}
          <p className="flex items-center justify-between rounded-2xl border border-border p-4 sm:col-span-2">
            <span className="text-sm font-semibold">Total contado</span>
            <span className="font-mono text-lg font-bold">{formatCOP(sumaConteo)}</span>
          </p>
          {conteoInvalido && (
            <p className="text-sm text-danger sm:col-span-2">
              Las cantidades son enteras: se cuentan billetes y monedas, no partes.
            </p>
          )}
        </div>
      ) : (
        <Campo id="saldoContado" etiqueta="Saldo contado *" escala="grande" error={totalInvalido && total !== "" ? "No puede ser negativo" : undefined}>
          <CampoPesos
            id="saldoContado"
            className={CONTROL}
            value={total}
            onChange={setTotal}
          />
        </Campo>
      )}

      {/* El resultado aparece mientras se cuenta, no al guardar: si alguien
          contó mal, tiene que enterarse antes de cerrar y no después. */}
      <Aviso
        tono={diferencia === 0 ? "exito" : diferencia < 0 ? "error" : "alarma"}
        titulo={
          diferencia === 0
            ? "Caja cuadrada"
            : diferencia < 0
              ? "Faltante"
              : "Sobrante"
        }
        cifra={diferencia === 0 ? undefined : formatCOP(Math.abs(diferencia))}
      >
        {diferencia === 0
          ? "Lo contado coincide con el sistema: el cierre no genera ningún asiento."
          : diferencia > 0
            ? "Se asienta como sobrante de caja."
            : "Decí qué pasa con la plata que falta: el asiento depende de eso."}
      </Aviso>

      {faltante && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            ¿Quién responde por el faltante?
          </legend>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup">
            {(
              [
                ["RESPONSABLE", "Lo paga el responsable", "Queda como cuenta por cobrar a esa persona."],
                ["EMPRESA", "Lo asume la empresa", "Se registra como gasto."],
              ] as const
            ).map(([valor, titulo, detalle]) => (
              <button
                key={valor}
                type="button"
                role="radio"
                aria-checked={tratamiento === valor}
                onClick={() => setTratamiento(valor)}
                className={cn(
                  "rounded-2xl border p-4 text-left transition-colors",
                  tratamiento === valor
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-accent",
                )}
              >
                <span className="block text-sm font-semibold">{titulo}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{detalle}</span>
              </button>
            ))}
          </div>
          {intento && faltaTratamiento && (
            <p className="text-sm text-danger">Elegí una de las dos para poder cerrar.</p>
          )}

          {tratamiento === "RESPONSABLE" && (
            <Campo
              id="responsable"
              etiqueta="¿A quién se le cobra? *"
              ayuda={
                caja.responsable
                  ? "Viene el responsable de la caja; cambialo si ese día contó otra persona."
                  : "Esta caja no tiene responsable asignado."
              }
              error={intento && faltaResponsable ? "Elegí a quién se le cobra" : undefined}
              escala="grande"
            >
              <SelectorTercero
                rol="empleado"
                valor={responsable}
                onElegir={setResponsable}
                invalido={intento && faltaResponsable}
              />
            </Campo>
          )}
        </fieldset>
      )}

      <Campo id="nota" etiqueta="Nota" escala="grande">
        <Textarea
          id="nota"
          className="min-h-20 rounded-xl px-4 py-3"
          placeholder="Opcional"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />
      </Campo>
    </form>
  );
}
