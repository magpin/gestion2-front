"use client";

import { useState } from "react";
import { CentroDelDocumento } from "@/modules/plan-cuentas/components/CentroDelDocumento";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aviso } from "@/lib/avisos";
import { cn } from "@/lib/utils";
import { useTieneRol } from "@/core/store/authStore";
import { Campo } from "@/modules/configuracion/components/Campo";
import { SelectorCuenta } from "@/modules/contabilidad/components/SelectorCuenta";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";
import {
  REGLAS_SUGERIDAS,
  leerPalabras,
  problemaRegla,
  type BorradorRegla,
} from "../lib/reglasExtracto";
import { nombreCuenta, useCuentasContables } from "../lib/useCuentasContables";
import { cuentasBancariasApi, reglasExtractoApi } from "../services/bancos.service";
import type { ReglaExtractoResumen, TipoLineaExtracto } from "../types/bancos.types";

const TODAS = "TODAS";

/**
 * Las reglas del extracto: «las líneas débito que dicen GMF son 4×1000 y van
 * contra tal cuenta». Reconocen; la conciliación muestra «Registrar las 23
 * líneas de 4×1000» y una persona confirma. Nada se registra solo.
 *
 * Solo CONTADOR y DIRECTOR las crean o cambian: elegir la cuenta es una
 * decisión de mapeo contable. El resto las ve. No se borran: se desactivan.
 */
export function ReglasExtractoSeccion() {
  const queryClient = useQueryClient();
  const puedeConfigurar = useTieneRol("CONTADOR", "DIRECTOR");

  const [editando, setEditando] = useState<
    { regla: ReglaExtractoResumen } | { borrador: BorradorRegla } | null
  >(null);

  const clave = ["extracto-reglas"];
  const { data: reglas = [], isLoading } = useQuery({
    queryKey: clave,
    queryFn: reglasExtractoApi.listar,
  });
  const cuentasContables = useCuentasContables(reglas.length > 0 || editando !== null);
  const { data: cuentasBancarias = [] } = useQuery({
    queryKey: ["cuentas-bancarias", "todas"],
    queryFn: () => cuentasBancariasApi.listar({ incluirInactivas: true }),
    staleTime: 5 * 60_000,
  });
  const nombreBancaria = (id: string | null) => {
    if (id === null) return "Todas las cuentas";
    const c = cuentasBancarias.find((x) => x.id === id);
    return c ? `${c.banco} ${c.numero_cuenta}` : "Cuenta bancaria";
  };

  const refrescar = async () => {
    await queryClient.invalidateQueries({ queryKey: clave });
    // Una regla nueva cambia lo que la conciliación reconoce.
    await queryClient.invalidateQueries({ queryKey: ["extractos", "propuestas"] });
  };

  const alternar = useMutation({
    mutationFn: (r: ReglaExtractoResumen) =>
      reglasExtractoApi.actualizar(r.id, { activa: !r.activa }),
    onSuccess: async (r) => {
      await refrescar();
      aviso.exito(r.activa ? "Regla activada" : "Regla desactivada");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24 text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div className="max-w-2xl">
            <h3 className="font-semibold">Reglas del extracto</h3>
            <p className="text-xs text-muted-foreground">
              Reconocen en el extracto lo que el banco cobra o abona solo —4×1000,
              comisiones, cuota de manejo— y lo proponen para registrar en un gesto. No
              registran nada solas: una persona confirma en Conciliación.
            </p>
          </div>
          {puedeConfigurar && (
            <Button
              type="button"
              onClick={() =>
                setEditando({
                  borrador: { nombre: "", palabras: "", tipoLinea: "DEBITO", concepto: "" },
                })
              }
              className="h-10 rounded-xl px-5 text-sm"
            >
              Nueva regla
            </Button>
          )}
        </div>

        {reglas.length === 0 ? (
          <div className="p-5">
            <p className="mb-4 text-sm text-muted-foreground">
              Todavía no hay reglas. Estas tres cubren lo que casi todo extracto trae;
              traen las palabras, y la cuenta la elige usted.
            </p>
            <ul className="grid gap-3 md:grid-cols-3">
              {REGLAS_SUGERIDAS.map((s) => (
                <li key={s.nombre} className="flex flex-col gap-2 rounded-2xl border border-dashed border-border p-4">
                  <span className="font-medium">{s.nombre}</span>
                  <Palabras palabras={leerPalabras(s.palabras)} />
                  {puedeConfigurar && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditando({ borrador: s })}
                      className="mt-auto h-9 rounded-xl px-4 text-xs"
                    >
                      Elegir cuenta y guardar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {reglas.map((r) => (
              <li
                key={r.id}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-4 px-5 py-4 text-sm",
                  !r.activa && "opacity-60",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{r.nombre}</span>
                    <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {r.tipo_linea === "DEBITO" ? "Débitos" : "Créditos"}
                    </span>
                    {!r.activa && (
                      <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        Inactiva
                      </span>
                    )}
                  </span>
                  <span className="mt-1.5 block">
                    <Palabras palabras={r.palabras} />
                  </span>
                  <span className="mt-1.5 block text-xs text-muted-foreground">
                    {nombreCuenta(cuentasContables.get(r.contra_cuenta_id))} · {r.concepto} ·{" "}
                    {nombreBancaria(r.cuenta_bancaria_id)}
                  </span>
                </span>
                {puedeConfigurar && (
                  <span className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditando({ regla: r })}
                      className="h-9 gap-1.5 rounded-xl px-3 text-xs"
                    >
                      <Pencil className="size-3.5" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={alternar.isPending}
                      onClick={() => alternar.mutate(r)}
                      className="h-9 rounded-xl px-3 text-xs"
                    >
                      {r.activa ? "Desactivar" : "Activar"}
                    </Button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!puedeConfigurar && (
        <p className="mt-3 text-xs text-muted-foreground">
          Solo Contador o Director pueden crear o cambiar reglas.
        </p>
      )}

      {editando !== null && (
        <DialogoRegla
          regla={"regla" in editando ? editando.regla : null}
          borrador={
            "regla" in editando
              ? {
                  nombre: editando.regla.nombre,
                  palabras: editando.regla.palabras.join(", "),
                  tipoLinea: editando.regla.tipo_linea,
                  concepto: editando.regla.concepto,
                }
              : editando.borrador
          }
          cuentaInicial={
            "regla" in editando
              ? (cuentasContables.get(editando.regla.contra_cuenta_id) ?? null)
              : null
          }
          cuentasBancarias={cuentasBancarias.filter((c) => c.activa)}
          nombreBancaria={nombreBancaria}
          onGuardada={async () => {
            await refrescar();
            setEditando(null);
          }}
          onCerrar={() => setEditando(null)}
        />
      )}
    </>
  );
}

function Palabras({ palabras }: { palabras: string[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {palabras.map((p) => (
        <span key={p} className="rounded-md border border-border px-2 py-0.5 font-mono text-xs">
          {p}
        </span>
      ))}
    </span>
  );
}

/**
 * Crear o editar una regla. El tipo de línea y la cuenta bancaria no se
 * editan: cambiarlos es otra regla, y la API tampoco los recibe en `PATCH`.
 */
function DialogoRegla({
  regla,
  borrador: inicial,
  cuentaInicial,
  cuentasBancarias,
  nombreBancaria,
  onGuardada,
  onCerrar,
}: {
  regla: ReglaExtractoResumen | null;
  borrador: BorradorRegla;
  cuentaInicial: CuentaEmpresa | null;
  cuentasBancarias: Array<{ id: string; banco: string; numero_cuenta: string }>;
  nombreBancaria: (id: string | null) => string;
  onGuardada: () => Promise<void>;
  onCerrar: () => void;
}) {
  const [b, setB] = useState<BorradorRegla>(inicial);
  const [cuenta, setCuenta] = useState<CuentaEmpresa | null>(cuentaInicial);
  const [bancaria, setBancaria] = useState<string>(TODAS);
  // El centro de costo de la regla. `null`: el del usuario o el de por defecto.
  const [centro, setCentro] = useState<string | null>(regla?.centro_costo_id ?? null);
  const deResultado = cuenta !== null && /^[4-7]/.test(cuenta.codigo);

  // Al editar, la cuenta cambia solo si se eligió otra. Sin esto se reenviaba
  // siempre, y una regla cuya cuenta hoy no pasa la validación (inactiva, o
  // que pasó a exigir tercero) no dejaba cambiar ni el nombre.
  const cuentaCambio = cuenta !== null && cuenta.id !== regla?.contra_cuenta_id;

  const guardar = useMutation({
    mutationFn: () => {
      const comun = {
        nombre: b.nombre.trim(),
        palabras: leerPalabras(b.palabras),
        concepto: b.concepto.trim(),
      };
      return regla
        ? reglasExtractoApi.actualizar(regla.id, {
            ...comun,
            ...(cuentaCambio ? { contraCuentaId: cuenta!.id } : {}),
            centroCostoId: deResultado ? centro : null,
          })
        : reglasExtractoApi.crear({
            ...comun,
            contraCuentaId: cuenta!.id,
            tipoLinea: b.tipoLinea,
            cuentaBancariaId: bancaria === TODAS ? undefined : bancaria,
            ...(deResultado && centro !== null && { centroCostoId: centro }),
          });
    },
    onSuccess: async () => {
      await onGuardada();
      aviso.exito(regla ? "Regla guardada" : "Regla creada");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  // Mismo criterio que el backend (`exigirContraCuenta`): la regla registra
  // sin tercero ni base gravable. El centro de costo lo lleva la regla.
  const noSirve = cuenta?.exige_tercero
    ? "tercero"
    : cuenta?.exige_base_gravable
      ? "base gravable"
      : null;
  // Al editar sin tocar la cuenta, su problema se muestra pero no bloquea: lo
  // que se está cambiando es otra cosa. Y si el plan todavía no cargó, la
  // cuenta sigue siendo la de la regla aunque el selector esté vacío.
  const bloqueaCuenta = noSirve !== null && (regla === null || cuentaCambio);
  const problema =
    problemaRegla(b) ??
    (regla === null && cuenta === null ? "Elija la cuenta contable." : null);

  return (
    <Dialog open onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="lg">
        <DialogHeader>
          <div>
            <DialogTitle>{regla ? `Editar «${regla.nombre}»` : "Nueva regla del extracto"}</DialogTitle>
            <DialogDescription>
              Las líneas que contengan alguna de estas palabras se proponen para
              registrar contra la cuenta. Palabras completas; no importan mayúsculas
              ni tildes.
            </DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>

        <DialogBody className="flex flex-col gap-5">
          <Campo id="nombre" etiqueta="Nombre" escala="grande">
            <Input
              id="nombre"
              maxLength={80}
              value={b.nombre}
              onChange={(e) => setB({ ...b, nombre: e.target.value })}
              className="h-11 rounded-xl px-4"
            />
          </Campo>

          <Campo
            id="palabras"
            etiqueta="Palabras"
            ayuda="Separadas por coma, hasta 10. «COMISION» no reconoce «COMISIONES»: escriba las dos."
            escala="grande"
          >
            <Input
              id="palabras"
              value={b.palabras}
              onChange={(e) => setB({ ...b, palabras: e.target.value })}
              placeholder="GMF, 4X1000"
              className="h-11 rounded-xl px-4 font-mono"
            />
          </Campo>

          <div className="grid gap-5 sm:grid-cols-2">
            <Campo id="tipoLinea" etiqueta="Líneas del banco" escala="grande">
              {regla ? (
                <p className="flex h-11 items-center text-sm">
                  {regla.tipo_linea === "DEBITO" ? "Débitos (lo que sale)" : "Créditos (lo que entra)"}
                </p>
              ) : (
                <Select
                  items={[
                    { value: "DEBITO", label: "Débitos (lo que sale)" },
                    { value: "CREDITO", label: "Créditos (lo que entra)" },
                  ]}
                  value={b.tipoLinea}
                  onValueChange={(v) => v && setB({ ...b, tipoLinea: v as TipoLineaExtracto })}
                >
                  <SelectTrigger id="tipoLinea" className="h-11 w-full rounded-xl px-4">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEBITO">Débitos (lo que sale)</SelectItem>
                    <SelectItem value="CREDITO">Créditos (lo que entra)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </Campo>

            <Campo id="bancaria" etiqueta="Cuenta bancaria" escala="grande">
              {regla ? (
                <p className="flex h-11 items-center text-sm">{nombreBancaria(regla.cuenta_bancaria_id)}</p>
              ) : (
                <Select
                  items={[
                    { value: TODAS, label: "Todas las cuentas" },
                    ...cuentasBancarias.map((c) => ({ value: c.id, label: `${c.banco} ${c.numero_cuenta}` })),
                  ]}
                  value={bancaria}
                  onValueChange={(v) => setBancaria(v ?? TODAS)}
                >
                  <SelectTrigger id="bancaria" className="h-11 w-full rounded-xl px-4">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TODAS}>Todas las cuentas</SelectItem>
                    {cuentasBancarias.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.banco} {c.numero_cuenta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Campo>
          </div>

          <Campo
            id="contraCuenta"
            etiqueta="Cuenta contable"
            ayuda="El gasto o el ingreso. La elige el contador: no hay una sugerida."
            escala="grande"
          >
            <SelectorCuenta valor={cuenta} onElegir={setCuenta} invalido={noSirve !== null} crear={{ madres: "cualquiera" }} />
          </Campo>

          {noSirve && (
            <p className="rounded-2xl bg-warning/10 p-4 text-sm text-warning">
              Esta cuenta exige {noSirve}, y una regla registra sus líneas sin él. Elija
              otra auxiliar.
            </p>
          )}

          {deResultado && <CentroDelDocumento valor={centro} onCambiar={setCentro} className="max-w-sm" />}

          <Campo id="concepto" etiqueta="Concepto" ayuda="Lo que va a decir cada nota en el libro." escala="grande">
            <Input
              id="concepto"
              maxLength={300}
              value={b.concepto}
              onChange={(e) => setB({ ...b, concepto: e.target.value })}
              className="h-11 rounded-xl px-4"
            />
          </Campo>

          {problema && <p className="text-xs text-muted-foreground">{problema}</p>}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={problema !== null || bloqueaCuenta || guardar.isPending}
            onClick={() => guardar.mutate()}
            className="h-12 gap-2 rounded-xl px-6"
          >
            {guardar.isPending && <Loader2 className="size-4 animate-spin" />}
            {regla ? "Guardar" : "Crear regla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

