"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, FileUp, Loader2 } from "lucide-react";

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
import { CampoPesos } from "@/components/shared/CampoNumero";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aviso } from "@/lib/avisos";
import { cn, formatCOP, formatFecha } from "@/lib/utils";
import { Campo } from "@/modules/configuracion/components/Campo";
import {
  ajustarFormato,
  conEncabezados,
  cuadre,
  formatoGuardado,
  interpretar,
  leerArchivo,
  ordenFechaDudoso,
  proponerFormato,
  type ArchivoLeido,
  type FormatoExtracto,
} from "../lib/extractoArchivo";
import { letraColumna } from "../lib/xlsx";
import { cuentasBancariasApi, extractosApi } from "../services/bancos.service";
import type { CuentaBancariaResumen } from "../types/bancos.types";

type Paso = "ARCHIVO" | "MAPEO" | "REVISION";

const CONTROL = "h-11 rounded-xl px-4";
const MAX_LINEAS = 5000;
const NINGUNA = "NINGUNA";

/**
 * Subir el extracto en archivo, en tres pasos (paso 16c):
 *
 * 1. **El archivo.** Excel (.xlsx) o CSV. Se lee acá, en el navegador; a la
 *    API solo llegan las líneas ya leídas y la huella del archivo.
 * 2. **El mapeo.** Qué columna es qué. Viene lleno: con el de la última vez
 *    si la cuenta ya subió uno, o con lo que se adivina de los encabezados.
 * 3. **La revisión.** Las filas que no se pudieron leer, con su número y el
 *    motivo; el rango y los saldos; y el aviso grande de cuadrado o
 *    descuadrado. Guardar se bloquea si no cuadra: el backend lo rechazaría
 *    con el mismo número.
 */
export function DialogoImportarExtracto({
  cuenta,
  onCerrar,
}: {
  cuenta: CuentaBancariaResumen;
  onCerrar: () => void;
}) {
  const queryClient = useQueryClient();
  const [paso, setPaso] = useState<Paso>("ARCHIVO");
  const [archivo, setArchivo] = useState<ArchivoLeido | null>(null);
  const [formato, setFormato] = useState<FormatoExtracto | null>(null);
  const [recordado, setRecordado] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [errorLectura, setErrorLectura] = useState<string | null>(null);

  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [saldoFinal, setSaldoFinal] = useState("");

  // La cuenta fresca, no la que quedó elegida en pantalla: si se subió otro
  // extracto en esta sesión, su mapeo ya cambió.
  const { data: cuentaFresca } = useQuery({
    queryKey: ["cuentas-bancarias", "detalle", cuenta.id],
    queryFn: () => cuentasBancariasApi.porId(cuenta.id),
  });

  const elegir = async (f: File | undefined) => {
    if (!f) return;
    setLeyendo(true);
    setErrorLectura(null);
    try {
      const leido = await leerArchivo(f);
      const guardado = formatoGuardado((cuentaFresca ?? cuenta).formato_extracto);
      setArchivo(leido);
      setFormato(guardado ? ajustarFormato(guardado, leido.filas) : proponerFormato(leido.filas));
      setRecordado(guardado !== null);
      setPaso("MAPEO");
    } catch (e) {
      setErrorLectura(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    } finally {
      setLeyendo(false);
    }
  };

  const resultado = useMemo(
    () =>
      archivo && formato
        ? interpretar(archivo.filas, formato, { fechas1904: archivo.fechas1904 })
        : null,
    [archivo, formato],
  );
  const lineas = resultado?.lineas ?? [];
  const errores = resultado?.errores ?? [];

  const inicial = Number(saldoInicial);
  const final = Number(saldoFinal);
  const saldosDigitados = saldoInicial.trim() !== "" && saldoFinal.trim() !== "";
  const c = cuadre(lineas, saldosDigitados ? inicial : 0, saldosDigitados ? final : 0);
  const fueraDeRango = lineas.filter(
    (l) => (fechaDesde && l.fecha < fechaDesde) || (fechaHasta && l.fecha > fechaHasta),
  );
  const rangoOk = fechaDesde !== "" && fechaHasta !== "" && fechaDesde <= fechaHasta && fueraDeRango.length === 0;

  const irARevision = () => {
    // El rango propuesto es el de las líneas; se puede ampliar al período del extracto.
    setFechaDesde(c.desde ?? "");
    setFechaHasta(c.hasta ?? "");
    setPaso("REVISION");
  };

  const guardar = useMutation({
    mutationFn: () =>
      extractosApi.importar(cuenta.id, {
        fechaDesde,
        fechaHasta,
        saldoInicialBanco: inicial,
        saldoFinalBanco: final,
        archivoNombre: archivo!.nombre.slice(0, 255),
        archivoHuella: archivo!.huella,
        formato: conEncabezados(formato!, archivo!.filas) as unknown as Record<string, unknown>,
        lineas,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["extractos", cuenta.id] });
      // El mapeo quedó guardado en la cuenta: el mes siguiente viene lleno.
      await queryClient.invalidateQueries({ queryKey: ["cuentas-bancarias"] });
      aviso.exito(`Extracto subido: ${lineas.length} línea${lineas.length === 1 ? "" : "s"}`);
      onCerrar();
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const puedeGuardar =
    saldosDigitados &&
    Number.isFinite(inicial) &&
    Number.isFinite(final) &&
    c.cuadra &&
    rangoOk &&
    lineas.length > 0 &&
    lineas.length <= MAX_LINEAS;

  return (
    <Dialog open onOpenChange={(a) => !a && onCerrar()}>
      <DialogContent size="lg">
        <DialogHeader>
          <div>
            <DialogTitle>Subir extracto · {cuenta.banco} {cuenta.numero_cuenta}</DialogTitle>
            <DialogDescription>
              {paso === "ARCHIVO" && "Paso 1 de 3: el archivo del banco, en Excel (.xlsx) o CSV."}
              {paso === "MAPEO" && "Paso 2 de 3: qué columna es qué."}
              {paso === "REVISION" && "Paso 3 de 3: revisar y guardar."}
            </DialogDescription>
          </div>
          <DialogCloseIcon />
        </DialogHeader>

        <DialogBody className="flex flex-col gap-5">
          {paso === "ARCHIVO" && (
            <>
              <label
                htmlFor="archivo-extracto"
                className="flex cursor-pointer flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-14 text-center hover:bg-accent"
              >
                {leyendo ? (
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                ) : (
                  <FileUp className="size-8 text-muted-foreground" />
                )}
                <span className="font-semibold">Elija el archivo del extracto</span>
                <span className="text-xs text-muted-foreground">
                  Se lee en este navegador; al servidor solo llegan las líneas.
                </span>
                <input
                  id="archivo-extracto"
                  type="file"
                  accept=".xlsx,.csv,.txt"
                  className="sr-only"
                  disabled={leyendo}
                  onChange={(e) => elegir(e.target.files?.[0])}
                />
              </label>
              {errorLectura && (
                <p className="rounded-2xl bg-danger/10 p-4 text-sm text-danger">{errorLectura}</p>
              )}
            </>
          )}

          {paso === "MAPEO" && archivo && formato && (
            <Mapeo
              archivo={archivo}
              formato={formato}
              recordado={recordado}
              lineasLeidas={lineas.length}
              filasConError={errores.length}
              onCambiar={setFormato}
            />
          )}

          {paso === "REVISION" && (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <Campo id="fechaDesde" etiqueta="Desde" escala="grande">
                  <Input id="fechaDesde" type="date" className={CONTROL} value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
                </Campo>
                <Campo id="fechaHasta" etiqueta="Hasta" escala="grande">
                  <Input id="fechaHasta" type="date" className={CONTROL} value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
                </Campo>
                <Campo id="saldoInicial" etiqueta="Saldo inicial del banco" ayuda="El que dice el extracto al empezar el período." escala="grande">
                  <CampoPesos id="saldoInicial" negativo className={CONTROL} value={saldoInicial} onChange={setSaldoInicial} />
                </Campo>
                <Campo id="saldoFinal" etiqueta="Saldo final del banco" ayuda="El que dice el extracto al cerrar el período." escala="grande">
                  <CampoPesos id="saldoFinal" negativo className={CONTROL} value={saldoFinal} onChange={setSaldoFinal} />
                </Campo>
              </div>

              {fueraDeRango.length > 0 && (
                <p className="rounded-2xl bg-warning/10 p-4 text-sm text-warning">
                  {fueraDeRango.length} línea{fueraDeRango.length === 1 ? "" : "s"} quedan fuera del
                  rango (fila{fueraDeRango.length === 1 ? "" : "s"}{" "}
                  {fueraDeRango.slice(0, 5).map((l) => l.fila).join(", ")}
                  {fueraDeRango.length > 5 ? "…" : ""}). Amplíe el rango: el extracto tiene que contenerlas.
                </p>
              )}

              {lineas.length > MAX_LINEAS && (
                <p className="rounded-2xl bg-danger/10 p-4 text-sm text-danger">
                  {lineas.length} líneas: un extracto de más de {MAX_LINEAS.toLocaleString("es-CO")} se sube por partes.
                </p>
              )}

              {/* El aviso grande: cuadrado o descuadrado, con los números. */}
              {saldosDigitados ? (
                <div
                  className={cn(
                    "flex items-start gap-3 rounded-2xl p-5 text-sm",
                    c.cuadra ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
                  )}
                >
                  {c.cuadra ? <CheckCircle2 className="mt-0.5 size-5 shrink-0" /> : <CircleAlert className="mt-0.5 size-5 shrink-0" />}
                  <div>
                    <p className="text-base font-semibold">{c.cuadra ? "El extracto cuadra" : "El extracto no cuadra"}</p>
                    <p className="mt-1">
                      {formatCOP(inicial)} + créditos {formatCOP(c.creditos)} − débitos {formatCOP(c.debitos)} ={" "}
                      <span className="font-mono font-semibold">{formatCOP(c.calculado)}</span>
                      {c.cuadra
                        ? ", que es el saldo final del banco."
                        : `, y el banco dice ${formatCOP(final)}: ${
                            c.diferencia > 0 ? "faltan" : "sobran"
                          } ${formatCOP(Math.abs(c.diferencia))} en las líneas leídas.`}
                    </p>
                    {!c.cuadra && (
                      <p className="mt-1">
                        Casi siempre es el débito y el crédito cruzados en el mapeo, un separador decimal
                        equivocado, o una fila con valores entre las que no se pudieron leer.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
                  Digite los dos saldos del extracto para ver si cuadra.
                </p>
              )}

              <p className="text-sm text-muted-foreground">
                {lineas.length} línea{lineas.length === 1 ? "" : "s"} leída{lineas.length === 1 ? "" : "s"}
                {c.desde && c.hasta && <> · del {formatFecha(c.desde)} al {formatFecha(c.hasta)}</>}
              </p>

              {errores.length > 0 && <Errores errores={errores} />}
            </>
          )}
        </DialogBody>

        <DialogFooter>
          {paso === "ARCHIVO" && (
            <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={onCerrar}>
              Cancelar
            </Button>
          )}
          {paso === "MAPEO" && (
            <>
              <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={() => setPaso("ARCHIVO")}>
                Otro archivo
              </Button>
              <Button type="button" disabled={lineas.length === 0} className="h-12 rounded-xl px-6" onClick={irARevision}>
                Revisar
              </Button>
            </>
          )}
          {paso === "REVISION" && (
            <>
              <Button type="button" variant="outline" className="h-12 rounded-xl px-6" onClick={() => setPaso("MAPEO")}>
                Volver al mapeo
              </Button>
              <Button
                type="button"
                disabled={!puedeGuardar || guardar.isPending}
                className="h-12 gap-2 rounded-xl px-6"
                onClick={() => guardar.mutate()}
              >
                {guardar.isPending && <Loader2 className="size-4 animate-spin" />}
                Guardar extracto
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Errores({ errores }: { errores: Array<{ fila: number; motivo: string }> }) {
  const MOSTRAR = 50;
  return (
    <section className="rounded-2xl border border-warning">
      <p className="border-b border-warning px-4 py-3 text-sm font-semibold text-warning">
        {errores.length} fila{errores.length === 1 ? "" : "s"} que no se pudo leer y no se sube
        {errores.length === 1 ? "" : "n"}
      </p>
      <ul className="max-h-48 divide-y divide-border overflow-y-auto text-sm">
        {errores.slice(0, MOSTRAR).map((e) => (
          <li key={e.fila} className="flex gap-3 px-4 py-2">
            <span className="w-16 shrink-0 font-mono text-muted-foreground">Fila {e.fila}</span>
            <span>{e.motivo}</span>
          </li>
        ))}
        {errores.length > MOSTRAR && (
          <li className="px-4 py-2 text-muted-foreground">Y {errores.length - MOSTRAR} más.</li>
        )}
      </ul>
    </section>
  );
}

/**
 * El mapeo: una vista de las primeras filas del archivo con la letra de cada
 * columna, y un selector por cada dato. Lo que se cambia se ve enseguida en
 * cuántas líneas se leen y cuántas fallan.
 */
function Mapeo({
  archivo,
  formato: f,
  recordado,
  lineasLeidas,
  filasConError,
  onCambiar,
}: {
  archivo: ArchivoLeido;
  formato: FormatoExtracto;
  recordado: boolean;
  lineasLeidas: number;
  filasConError: number;
  onCambiar: (f: FormatoExtracto) => void;
}) {
  const ancho = Math.max(...archivo.filas.slice(0, 60).map((x) => x.celdas.length), 1);
  const encabezado = archivo.filas.find((x) => x.fila === f.filaInicio - 1);
  const opciones = Array.from({ length: ancho }, (_, i) => {
    const nombre = encabezado?.celdas[i];
    return {
      value: String(i),
      label: `${letraColumna(i)}${typeof nombre === "string" && nombre.trim() ? ` · ${nombre.trim()}` : ""}`,
    };
  });
  const vista = archivo.filas.filter((x) => x.fila >= f.filaInicio - 1).slice(0, 7);

  const columna = (etiqueta: string, valor: number, cambiar: (n: number) => void) => (
    <Campo id={etiqueta} etiqueta={etiqueta} escala="grande">
      <Select items={opciones} value={String(valor)} onValueChange={(v) => v !== null && cambiar(Number(v))}>
        <SelectTrigger id={etiqueta} className="h-11 w-full rounded-xl px-4">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opciones.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Campo>
  );

  const eleccion = <T extends string>(
    etiqueta: string,
    valor: T,
    items: Array<{ value: T; label: string }>,
    cambiar: (v: T) => void,
  ) => (
    <Campo id={etiqueta} etiqueta={etiqueta} escala="grande">
      <Select items={items} value={valor} onValueChange={(v) => v !== null && cambiar(v as T)}>
        <SelectTrigger id={etiqueta} className="h-11 w-full rounded-xl px-4">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Campo>
  );

  return (
    <>
      <p className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{archivo.nombre}</span> ·{" "}
        {recordado
          ? "el mapeo es el de la última vez que esta cuenta subió un extracto."
          : "el mapeo se adivinó de los encabezados: revíselo."}
      </p>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border bg-muted/40 text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2">Fila</th>
              {Array.from({ length: ancho }, (_, i) => (
                <th key={i} scope="col" className="px-3 py-2 font-mono">{letraColumna(i)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {vista.map((x) => (
              <tr key={x.fila} className={cn(x.fila < f.filaInicio && "bg-muted/40 font-semibold")}>
                <td className="px-3 py-2 font-mono text-muted-foreground">{x.fila}</td>
                {Array.from({ length: ancho }, (_, i) => (
                  <td key={i} className="max-w-48 truncate px-3 py-2">
                    {x.celdas[i] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="filaInicio" etiqueta="Los datos empiezan en la fila" escala="grande">
          <Input
            id="filaInicio"
            type="number"
            min={1}
            className={CONTROL}
            value={f.filaInicio}
            onChange={(e) => {
              const n = Math.max(1, Math.floor(Number(e.target.value) || 1));
              onCambiar({ ...f, filaInicio: n });
            }}
          />
        </Campo>
        {columna("Fecha", f.fecha, (n) => onCambiar({ ...f, fecha: n }))}
        {columna("Descripción", f.descripcion, (n) => onCambiar({ ...f, descripcion: n }))}

        <Campo id="Referencia" etiqueta="Referencia" escala="grande">
          <Select
            items={[{ value: NINGUNA, label: "Ninguna" }, ...opciones]}
            value={f.referencia === null ? NINGUNA : String(f.referencia)}
            onValueChange={(v) => v !== null && onCambiar({ ...f, referencia: v === NINGUNA ? null : Number(v) })}
          >
            <SelectTrigger id="Referencia" className="h-11 w-full rounded-xl px-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NINGUNA}>Ninguna</SelectItem>
              {opciones.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Campo>

        {eleccion(
          "Cómo viene el valor",
          f.valor.modo,
          [
            { value: "DOS", label: "Débito y crédito en columnas aparte" },
            { value: "UNA", label: "Una columna con signo (negativo es débito)" },
          ],
          (modo) =>
            onCambiar({
              ...f,
              valor:
                modo === "UNA"
                  ? { modo, columna: f.valor.modo === "DOS" ? f.valor.debito : f.valor.columna }
                  : {
                      modo,
                      debito: f.valor.modo === "UNA" ? f.valor.columna : f.valor.debito,
                      credito: f.valor.modo === "UNA" ? f.valor.columna + 1 : f.valor.credito,
                    },
            }),
        )}

        {f.valor.modo === "UNA" ? (
          columna("Valor", f.valor.columna, (n) => onCambiar({ ...f, valor: { modo: "UNA", columna: n } }))
        ) : (
          <>
            {columna("Débito (lo que sale)", f.valor.debito, (n) =>
              onCambiar({ ...f, valor: { ...(f.valor as { modo: "DOS"; debito: number; credito: number }), debito: n } }),
            )}
            {columna("Crédito (lo que entra)", f.valor.credito, (n) =>
              onCambiar({ ...f, valor: { ...(f.valor as { modo: "DOS"; debito: number; credito: number }), credito: n } }),
            )}
          </>
        )}

        {eleccion(
          "Separador decimal",
          f.decimal,
          [
            { value: ",", label: "Coma: 1.234.567,89" },
            { value: ".", label: "Punto: 1,234,567.89" },
          ],
          (decimal) => onCambiar({ ...f, decimal }),
        )}
        {eleccion(
          "Orden de la fecha",
          f.ordenFecha,
          [
            { value: "DMA", label: "Día/mes/año: 30/09/2026" },
            { value: "MDA", label: "Mes/día/año: 09/30/2026" },
            { value: "AMD", label: "Año-mes-día: 2026-09-30" },
          ],
          (ordenFecha) => onCambiar({ ...f, ordenFecha }),
        )}
      </div>

      {f.ordenFecha !== "AMD" && ordenFechaDudoso(archivo.filas, f) && (
        <p className="rounded-2xl bg-warning/10 p-4 text-sm text-warning">
          Ninguna fecha del archivo tiene un número mayor a 12, así que no se puede saber si
          viene día/mes o mes/día. Revise el orden con una fecha que conozca: si está al
          revés, el extracto cuadra igual y las fechas quedan cambiadas.
        </p>
      )}

      <p
        className={cn(
          "rounded-2xl p-4 text-sm",
          lineasLeidas === 0 ? "bg-danger/10 text-danger" : "bg-muted text-muted-foreground",
        )}
      >
        Con este mapeo se leen <span className="font-semibold">{lineasLeidas}</span> línea
        {lineasLeidas === 1 ? "" : "s"}
        {filasConError > 0 && (
          <>
            {" "}y <span className="font-semibold">{filasConError}</span> fila{filasConError === 1 ? "" : "s"} no se
            puede{filasConError === 1 ? "" : "n"} leer (se ven en el paso siguiente)
          </>
        )}
        .
      </p>
    </>
  );
}
