"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";

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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aviso } from "@/lib/avisos";
import { Campo } from "@/modules/configuracion/components/Campo";
import { SelectorCuenta } from "@/modules/contabilidad/components/SelectorCuenta";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";
import { retencionesApi } from "@/modules/retenciones/services/retenciones.service";
import { conceptosApi } from "../services/conceptos.service";
import {
  CLASES_TIPO,
  NOMBRE_FLUJO,
  NOMBRE_IVA_COMPRA,
  NOMBRE_TIPO,
  type Concepto,
  type IvaCompra,
  type TipoConcepto,
  type TipoFlujo,
} from "../types/conceptos.types";

const TIPOS: TipoConcepto[] = ["INGRESO", "COSTO", "GASTO", "NO_GASTO"];
const FLUJOS: TipoFlujo[] = ["OPERACION", "INVERSION", "FINANCIACION"];

/** Lo que dice cada tipo, para quien no es contador. */
const AYUDA_TIPO: Record<TipoConcepto, string> = {
  INGRESO: "Entra al estado de resultados como ingreso. Va a una cuenta de clase 4.",
  COSTO: "Costo de lo que se vende o del servicio. Va a una cuenta de clase 6 o 7.",
  GASTO: "Entra al estado de resultados como gasto. Va a una cuenta de clase 5.",
  NO_GASTO:
    "Mueve plata sin ser ingreso ni gasto: un crédito, un impuesto por pagar, un anticipo. Va a una cuenta de clase 1, 2 o 3.",
};

/**
 * Crear un concepto propio o cambiarle la cuenta, el nombre o el flujo a uno
 * que ya existe. El tipo no se cambia después de creado: un gasto que pasa a
 * «no gasto» es otro concepto.
 */
export function DialogoConcepto({
  abierto,
  concepto,
  tipoInicial,
  onCerrar,
}: {
  abierto: boolean;
  /** `null` para crear uno nuevo. */
  concepto: Concepto | null;
  tipoInicial: TipoConcepto;
  onCerrar: () => void;
}) {
  return (
    <Dialog open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="lg">
        {/* El formulario se monta de nuevo en cada apertura: arranca con los
            datos del concepto que se abrió, no con los del anterior. */}
        {abierto && (
          <Formulario
            key={concepto?.id ?? "nuevo"}
            concepto={concepto}
            tipoInicial={tipoInicial}
            onCerrar={onCerrar}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Formulario({
  concepto,
  tipoInicial,
  onCerrar,
}: {
  concepto: Concepto | null;
  tipoInicial: TipoConcepto;
  onCerrar: () => void;
}) {
  const queryClient = useQueryClient();
  const creando = concepto === null;

  const [nombre, setNombre] = useState(concepto?.nombre ?? "");
  const [grupo, setGrupo] = useState(concepto?.grupo ?? "");
  const [tipo, setTipo] = useState<TipoConcepto>(concepto?.tipo ?? tipoInicial);
  const [flujo, setFlujo] = useState<TipoFlujo>(concepto?.tipoFlujo ?? "OPERACION");
  const [cuenta, setCuenta] = useState<CuentaEmpresa | null>(
    concepto?.cuenta ? ({ ...concepto.cuenta } as CuentaEmpresa) : null,
  );
  const [intentado, setIntentado] = useState(false);
  // Lo que el concepto le sugiere al motor al comprar (PC23). Solo en gastos y costos.
  const [ivaCompra, setIvaCompra] = useState<IvaCompra | "">(concepto?.ivaCompra ?? "");
  const [retencion, setRetencion] = useState(concepto?.retencionSugerida ?? "");
  const [reteica, setReteica] = useState(concepto?.aplicaReteica ?? false);
  const [deducible, setDeducible] = useState(concepto?.deducible ?? true);
  const [pistas, setPistas] = useState<string[]>(concepto?.pistas ?? []);
  const [pista, setPista] = useState("");
  const esCompra = tipo === "GASTO" || tipo === "COSTO";
  const { data: retenciones = [] } = useQuery({
    queryKey: ["retenciones", "conceptos"],
    queryFn: () => retencionesApi.conceptos(),
    enabled: esCompra,
  });
  const deRenta = retenciones.filter((c) => c.tipo === "RENTA");
  const agregarPista = () => {
    const p = pista.trim().toLowerCase();
    if (p.length >= 2 && !pistas.includes(p) && pistas.length < 20) setPistas([...pistas, p]);
    setPista("");
  };
  const sugerencias = esCompra
    ? {
        ivaCompra: ivaCompra === "" ? null : ivaCompra,
        retencionSugerida: retencion === "" ? null : retencion,
        aplicaReteica: reteica,
        deducible,
      }
    : {};

  const guardar = useMutation({
    mutationFn: () =>
      creando
        ? conceptosApi.crear({
            nombre: nombre.trim(),
            grupo: grupo.trim(),
            tipo,
            cuentaId: cuenta!.id,
            tipoFlujo: flujo,
            pistas,
            ...sugerencias,
          })
        : conceptosApi.editar(concepto.id, {
            nombre: nombre.trim(),
            grupo: grupo.trim(),
            cuentaId: cuenta?.id !== concepto.cuenta?.id ? cuenta?.id : undefined,
            tipoFlujo: flujo,
            pistas,
            ...sugerencias,
          }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["conceptos"] });
      aviso.exito(creando ? "Concepto creado" : "Concepto guardado");
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const faltaNombre = nombre.trim().length < 2;
  const faltaGrupo = grupo.trim().length < 2;
  const faltaCuenta = cuenta === null;

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    setIntentado(true);
    if (faltaNombre || faltaGrupo || faltaCuenta) return;
    guardar.mutate();
  };

  return (
    <form onSubmit={enviar} className="contents">
      <DialogHeader>
        <div>
          <DialogTitle>{creando ? "Nuevo concepto" : concepto.nombre}</DialogTitle>
          <DialogDescription>
            {creando
              ? "Lo que se va a elegir al registrar. Cuelga de un auxiliar del plan de cuentas."
              : concepto.esSistema
                ? "Concepto del sistema: se le puede cambiar la cuenta y el nombre."
                : "Concepto propio de la empresa."}
          </DialogDescription>
        </div>
        <DialogCloseIcon />
      </DialogHeader>

      <DialogBody>
        <div className="flex flex-col gap-5">
          <Campo id="concepto-nombre" etiqueta="Nombre" error={intentado && faltaNombre ? "Escribí el nombre." : undefined}>
            <Input
              id="concepto-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              maxLength={80}
              placeholder="Fumigación del local"
              className="h-11 rounded-xl px-4"
            />
          </Campo>

          <Campo
            id="concepto-grupo"
            etiqueta="Grupo"
            ayuda="Cómo se agrupa en la lista: «Mantenimiento», «Financieros»."
            error={intentado && faltaGrupo ? "Escribí el grupo." : undefined}
          >
            <Input
              id="concepto-grupo"
              value={grupo}
              onChange={(e) => setGrupo(e.target.value)}
              maxLength={60}
              className="h-11 rounded-xl px-4"
            />
          </Campo>

          <Campo id="concepto-tipo" etiqueta="Tipo" ayuda={AYUDA_TIPO[tipo]}>
            <Select
              items={TIPOS.map((t) => ({ value: t, label: NOMBRE_TIPO[t] }))}
              value={tipo}
              disabled={!creando}
              onValueChange={(v) => {
                if (v === null) return;
                setTipo(v as TipoConcepto);
                // La cuenta elegida puede no servirle al tipo nuevo.
                if (cuenta && !CLASES_TIPO[v as TipoConcepto].includes(cuenta.codigo[0])) setCuenta(null);
              }}
            >
              <SelectTrigger id="concepto-tipo" className="h-11 w-full rounded-xl px-4">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {NOMBRE_TIPO[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          <Campo
            id="concepto-cuenta"
            etiqueta="Va a la cuenta"
            ayuda={`Solo auxiliares de clase ${CLASES_TIPO[tipo].join(" o ")}.`}
            error={intentado && faltaCuenta ? "Elegí la cuenta." : undefined}
          >
            <SelectorCuenta
              valor={cuenta}
              onElegir={setCuenta}
              clases={CLASES_TIPO[tipo]}
              crear={{ madres: CLASES_TIPO[tipo] }}
              invalido={intentado && faltaCuenta}
            />
          </Campo>

          <Campo
            id="concepto-flujo"
            etiqueta="En el flujo de caja"
            ayuda="Operación es el día a día; financiación, créditos y socios; inversión, activos."
          >
            <Select
              items={FLUJOS.map((f) => ({ value: f, label: NOMBRE_FLUJO[f] }))}
              value={flujo}
              onValueChange={(v) => v !== null && setFlujo(v as TipoFlujo)}
            >
              <SelectTrigger id="concepto-flujo" className="h-11 w-full rounded-xl px-4">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FLUJOS.map((f) => (
                  <SelectItem key={f} value={f}>
                    {NOMBRE_FLUJO[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          {esCompra && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo id="concepto-iva" etiqueta="IVA de la compra" ayuda="Sugerencia: en cada compra se puede cambiar.">
                  <select
                    id="concepto-iva"
                    value={ivaCompra}
                    onChange={(e) => setIvaCompra(e.target.value as IvaCompra | "")}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Según la factura</option>
                    {(Object.keys(NOMBRE_IVA_COMPRA) as IvaCompra[]).map((i) => (
                      <option key={i} value={i}>
                        {NOMBRE_IVA_COMPRA[i]}
                      </option>
                    ))}
                  </select>
                </Campo>
                <Campo id="concepto-retencion" etiqueta="Retención en la fuente" ayuda="La que se propone; el motor decide con el proveedor y la base.">
                  <select
                    id="concepto-retencion"
                    value={retencion}
                    onChange={(e) => setRetencion(e.target.value)}
                    className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Que la proponga el motor</option>
                    {deRenta.map((c) => (
                      <option key={c.codigo} value={c.codigo}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </Campo>
              </div>
              <div className="flex flex-col gap-3 rounded-2xl border border-border p-4">
                <label className="flex items-start gap-2.5 text-sm">
                  <Checkbox checked={reteica} onCheckedChange={(v) => setReteica(v === true)} className="mt-0.5" />
                  <span>
                    Se le practica ReteICA
                    <span className="block text-xs text-muted-foreground">
                      La tarifa depende del municipio y la actividad del proveedor: la pone el motor.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2.5 text-sm">
                  <Checkbox checked={deducible} onCheckedChange={(v) => setDeducible(v === true)} className="mt-0.5" />
                  <span>
                    Se puede restar en la renta
                    <span className="block text-xs text-muted-foreground">Siempre que tenga factura electrónica o documento soporte.</span>
                  </span>
                </label>
              </div>
            </>
          )}

          <Campo id="concepto-pistas" etiqueta="Palabras con las que María lo reconoce">
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-input px-2 py-2">
              {pistas.map((p) => (
                <span key={p} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs">
                  {p}
                  <button type="button" aria-label={`Quitar «${p}»`} onClick={() => setPistas(pistas.filter((x) => x !== p))}>
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <input
                id="concepto-pistas"
                value={pista}
                onChange={(e) => setPista(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    agregarPista();
                  }
                }}
                onBlur={agregarPista}
                placeholder="Agregar…"
                className="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none"
              />
            </div>
          </Campo>

          {esCompra && cuenta && (
            <div className="rounded-2xl bg-muted px-4 py-3 text-xs">
              <p className="mb-1 font-bold uppercase tracking-[0.14em] text-muted-foreground">Así se registra una compra con este concepto</p>
              <ul className="flex flex-col gap-0.5">
                <li className="flex justify-between gap-3">
                  <span>
                    <span className="font-mono text-muted-foreground">{cuenta.codigo}</span> {cuenta.nombre}
                  </span>
                  <span>Débito</span>
                </li>
                {ivaCompra === "DESCONTABLE" && (
                  <li className="flex justify-between gap-3">
                    <span>
                      <span className="font-mono text-muted-foreground">2408</span> IVA descontable
                    </span>
                    <span>Débito</span>
                  </li>
                )}
                {(retencion !== "" || reteica) && (
                  <li className="flex justify-between gap-3">
                    <span>
                      {retencion !== "" && (
                        <>
                          <span className="font-mono text-muted-foreground">2365</span> Retención en la fuente
                        </>
                      )}
                      {retencion !== "" && reteica && " · "}
                      {reteica && (
                        <>
                          <span className="font-mono text-muted-foreground">2368</span> ReteICA
                        </>
                      )}
                    </span>
                    <span>Crédito</span>
                  </li>
                )}
                <li className="flex justify-between gap-3">
                  <span>
                    <span className="font-mono text-muted-foreground">2205</span> Proveedores, o la caja o el banco si es de contado
                  </span>
                  <span>Crédito</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={onCerrar}>
          Cancelar
        </Button>
        <Button type="submit" className="h-12 rounded-xl px-6" disabled={guardar.isPending}>
          {guardar.isPending && <Loader2 className="size-4 animate-spin" />}
          {creando ? "Crear concepto" : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
