"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CalendarRange, Loader2, Printer } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCOP, formatFecha } from "@/lib/utils";
import { SelectorCuenta } from "../components/SelectorCuenta";
import { librosApi, periodosApi } from "../services/contabilidad.service";
import type { CuentaEmpresa } from "@/modules/plan-cuentas/types/plan-cuentas.types";

type Libro = "diario" | "mayor" | "balance";

const inicioDeMes = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

const hoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Los tres libros.
 *
 * No son tablas: son tres formas de leer las mismas líneas. El diario ordena por
 * fecha, el mayor agrupa por cuenta y el balance resume por período. Los tres
 * excluyen los asientos anulados.
 */
export function LibrosSeccion() {
  const [libro, setLibro] = useState<Libro>("diario");
  const [desde, setDesde] = useState(inicioDeMes());
  const [hasta, setHasta] = useState(hoy());
  const [cuenta, setCuenta] = useState<CuentaEmpresa | null>(null);
  const [periodoId, setPeriodoId] = useState("");

  const { data: periodos = [] } = useQuery({
    queryKey: ["periodos", "todos"],
    queryFn: () => periodosApi.listar(),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Libros contables
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Consultá la información financiera sin modificarla.
          </p>
        </div>
        {/* Un contador imprime los libros. Se usa la impresión del navegador:
            la tabla ya está en el DOM y `print` la respeta. */}
        <Button
          variant="outline"
          className="h-12 rounded-xl px-5 print:hidden"
          onClick={() => window.print()}
        >
          <Printer className="size-4" />
          Imprimir reporte
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 print:hidden">
        {(
          [
            ["diario", "Diario", "Movimientos, lo más reciente arriba"],
            ["mayor", "Mayor", "Saldos corridos por cuenta"],
            ["balance", "Balance de prueba", "Saldos del período"],
          ] as const
        ).map(([clave, titulo, descripcion]) => (
          <button
            key={clave}
            type="button"
            aria-pressed={libro === clave}
            onClick={() => setLibro(clave)}
            className={`rounded-3xl border p-6 text-left transition-colors ${
              libro === clave
                ? "border-input bg-muted"
                : "border-border bg-card hover:bg-accent"
            }`}
          >
            <BookOpen className="size-5 text-brand" />
            <h3 className="mt-6 text-xl font-semibold">{titulo}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{descripcion}</p>
          </button>
        ))}
      </div>

      <section className="flex flex-wrap items-end gap-4 rounded-2xl border border-border bg-card p-6 print:hidden">
        {libro === "balance" ? (
          <label className="flex min-w-64 flex-1 flex-col gap-2 text-sm font-medium">
            Período
            <Select items={periodos.map((p) => ({ value: p.id, label: `${p.anio}-${String(p.mes).padStart(2, "0")}` }))} value={periodoId} onValueChange={(v) => setPeriodoId(v ?? "")}>
              <SelectTrigger className="h-11 w-full rounded-xl px-4">
                <SelectValue placeholder="Elegí un período" />
              </SelectTrigger>
              <SelectContent>
                {periodos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.anio}-{String(p.mes).padStart(2, "0")} ·{" "}
                    {p.estado === "CERRADO" ? "cerrado" : "abierto"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        ) : (
          <>
            {libro === "mayor" && (
              <label className="flex min-w-72 flex-1 flex-col gap-2 text-sm font-medium">
                Cuenta
                <SelectorCuenta valor={cuenta} onElegir={setCuenta} crear={false} />
              </label>
            )}
            <label className="flex flex-col gap-2 text-sm font-medium">
              Desde
              <Input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="h-11 w-44 rounded-xl px-4"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Hasta
              <Input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="h-11 w-44 rounded-xl px-4"
              />
            </label>
          </>
        )}
      </section>

      {libro === "diario" && <Diario desde={desde} hasta={hasta} />}
      {libro === "mayor" && (
        <Mayor cuenta={cuenta} desde={desde} hasta={hasta} />
      )}
      {libro === "balance" && <Balance periodoId={periodoId} />}
    </div>
  );
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

function Cargando() {
  return (
    <div className="flex justify-center py-20 text-muted-foreground">
      <Loader2 className="size-6 animate-spin" />
    </div>
  );
}

function SinDatos({ titulo, texto }: { titulo: string; texto: string }) {
  return <EmptyState icon={CalendarRange} titulo={titulo} descripcion={texto} />;
}

function Diario({ desde, hasta }: { desde: string; hasta: string }) {
  const { data, isError, error, refetch } = useQuery({
    queryKey: ["libros", "diario", desde, hasta],
    queryFn: () => librosApi.diario(desde, hasta),
    meta: SILENCIOSO,
  });

  if (data === undefined)
    return isError ? (
      <ErrorCarga error={error} titulo="No se pudo leer el libro diario" onReintentar={refetch} />
    ) : (
      <Cargando />
    );
  if (data.length === 0)
    return (
      <SinDatos
        titulo="Sin asientos en estas fechas"
        texto="Entre esas fechas no se registró nada. Ampliá el rango con Desde y Hasta."
      />
    );

  return (
    <div className="flex flex-col gap-4">
      {data.map((a) => (
        <Marco key={a.id}>
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border bg-muted/40 px-6 py-4">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-sm font-bold">{a.numero}</span>
              <span className="text-sm text-muted-foreground">
                {formatFecha(a.fecha)}
              </span>
              <span className="text-sm font-medium">{a.glosa}</span>
            </div>
            <span className="font-mono text-sm font-semibold">
              {formatCOP(Number(a.total_debito))}
            </span>
          </div>

          <table className="w-full min-w-[760px] text-left">
            <tbody className="divide-y divide-border">
              {a.lineas.map((l) => (
                <tr key={`${a.id}-${l.orden}`}>
                  <td className="px-6 py-3 font-mono text-xs text-muted-foreground">
                    {l.cuenta_codigo}
                  </td>
                  <td className="px-5 py-3 text-sm">{l.cuenta_nombre}</td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">
                    {l.tercero_nombre ?? l.detalle ?? ""}
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-sm">
                    {Number(l.debito) > 0 ? formatCOP(Number(l.debito)) : ""}
                  </td>
                  <td className="px-6 py-3 text-right font-mono text-sm">
                    {Number(l.credito) > 0 ? formatCOP(Number(l.credito)) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Marco>
      ))}
    </div>
  );
}

function Mayor({
  cuenta,
  desde,
  hasta,
}: {
  cuenta: CuentaEmpresa | null;
  desde: string;
  hasta: string;
}) {
  const { data, isError, error, refetch } = useQuery({
    queryKey: ["libros", "mayor", cuenta?.id, desde, hasta],
    queryFn: () => librosApi.mayor(cuenta!.id, desde, hasta),
    enabled: cuenta !== null,
    meta: SILENCIOSO,
  });

  if (cuenta === null)
    return (
      <SinDatos
        titulo="Falta la cuenta"
        texto="El mayor se lee cuenta por cuenta. Elegí una arriba para ver sus movimientos y su saldo."
      />
    );
  if (data === undefined)
    return isError ? (
      <ErrorCarga error={error} titulo="No se pudo leer el mayor" onReintentar={refetch} />
    ) : (
      <Cargando />
    );
  if (data.movimientos.length === 0)
    return (
      <SinDatos
        titulo="Sin movimientos en estas fechas"
        texto="Esa cuenta no se movió entre esas fechas. Ampliá el rango o elegí otra cuenta."
      />
    );

  return (
    <Marco>
      <table className="w-full min-w-[900px] text-left">
        <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          <tr>
            {["Fecha", "Asiento", "Detalle", "Débito", "Crédito", "Saldo"].map(
              (t, i) => (
                <th
                  key={t}
                  scope="col"
                  className={`px-5 py-4 ${i >= 3 ? "text-right" : ""}`}
                >
                  {t}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.movimientos.map((m, i) => (
            <tr key={`${m.numero}-${i}`}>
              <td className="px-5 py-4 text-sm text-muted-foreground">
                {formatFecha(m.fecha)}
              </td>
              <td className="px-5 py-4 font-mono text-sm">{m.numero}</td>
              <td className="max-w-[320px] truncate px-5 py-4 text-sm">
                {m.detalle ?? m.glosa}
                {m.tercero_nombre && (
                  <span className="ml-2 text-muted-foreground">
                    · {m.tercero_nombre}
                  </span>
                )}
              </td>
              <td className="px-5 py-4 text-right font-mono text-sm">
                {Number(m.debito) > 0 ? formatCOP(Number(m.debito)) : ""}
              </td>
              <td className="px-5 py-4 text-right font-mono text-sm">
                {Number(m.credito) > 0 ? formatCOP(Number(m.credito)) : ""}
              </td>
              <td className="px-5 py-4 text-right font-mono text-sm font-semibold">
                {formatCOP(Number(m.saldo))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Marco>
  );
}

function Balance({ periodoId }: { periodoId: string }) {
  const { data, isError, error, refetch } = useQuery({
    queryKey: ["balance-prueba", periodoId],
    queryFn: () => librosApi.balancePrueba(periodoId),
    enabled: periodoId !== "",
    meta: SILENCIOSO,
  });

  if (periodoId === "")
    return (
      <SinDatos
        titulo="Falta el período"
        texto="El balance de prueba se arma por mes. Elegí un período arriba para verlo."
      />
    );
  if (data === undefined)
    return isError ? (
      <ErrorCarga error={error} titulo="No se pudo leer el balance de prueba" onReintentar={refetch} />
    ) : (
      <Cargando />
    );
  if (data.filas.length === 0)
    return (
      <SinDatos
        titulo="Sin saldos en este período"
        texto="Ese mes no tiene movimientos ni saldos que vengan de antes. Elegí otro período."
      />
    );

  const suma = (campo: "debitos" | "creditos") =>
    data.filas.reduce((s, f) => s + Number(f[campo]), 0);

  const debitos = suma("debitos");
  const creditos = suma("creditos");
  // Si esto no cuadra, algo está mal en el libro y hay que decirlo. No es un
  // adorno: es la comprobación que le da el nombre al balance de prueba.
  const cuadra = Math.round((debitos - creditos) * 100) === 0;

  return (
    <Marco>
      <table className="w-full min-w-[900px] text-left">
        <thead className="border-b border-border bg-muted/40 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          <tr>
            {[
              "Código",
              "Cuenta",
              "Saldo anterior",
              "Débitos",
              "Créditos",
              "Saldo final",
            ].map((t, i) => (
              <th
                key={t}
                scope="col"
                className={`px-5 py-4 ${i >= 2 ? "text-right" : ""}`}
              >
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.filas.map((f) => (
            <tr key={f.cuenta_id}>
              <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                {f.codigo}
              </td>
              <td className="px-5 py-4 text-sm font-medium">{f.nombre}</td>
              <td className="px-5 py-4 text-right font-mono text-sm text-muted-foreground">
                {formatCOP(Number(f.saldo_inicial))}
              </td>
              <td className="px-5 py-4 text-right font-mono text-sm">
                {formatCOP(Number(f.debitos))}
              </td>
              <td className="px-5 py-4 text-right font-mono text-sm">
                {formatCOP(Number(f.creditos))}
              </td>
              <td className="px-5 py-4 text-right font-mono text-sm font-semibold">
                {formatCOP(Number(f.saldo_final))}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-border bg-muted/40">
          <tr>
            <td colSpan={3} className="px-5 py-4 text-sm font-semibold">
              Totales
              {!cuadra && (
                <span className="ml-3 font-normal text-danger">
                  no cuadran — revisá el libro
                </span>
              )}
            </td>
            <td className="px-5 py-4 text-right font-mono text-sm font-bold">
              {formatCOP(debitos)}
            </td>
            <td className="px-5 py-4 text-right font-mono text-sm font-bold">
              {formatCOP(creditos)}
            </td>
            <td className="px-5 py-4" />
          </tr>
        </tfoot>
      </table>
    </Marco>
  );
}
