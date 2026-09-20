"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Link2Off, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { aviso } from "@/lib/avisos";
import { useTieneRol } from "@/core/store/authStore";
import { cn, formatCOP, formatFecha } from "@/lib/utils";
import { SelectorCuentaBancaria } from "../components/SelectorCuentaBancaria";
import { extractosApi, movimientosBancoApi } from "../services/bancos.service";
import {
  DIRECCION_MOVIMIENTO_BANCO,
  type CriterioGrupo,
  type CuentaBancariaResumen,
  type GrupoConciliacionInput,
  type LineaExtractoResumen,
  type MovimientoBancoResumen,
} from "../types/bancos.types";

/**
 * La conciliación: **el sistema propone y una persona confirma**. Nunca
 * concilia solo — una conciliación que se equivoca sola es peor que hacerla a
 * mano.
 *
 * Un cruce no es «una línea con un movimiento»: es un **grupo**, unas líneas
 * del extracto con unos movimientos del libro cuyas sumas con signo son
 * iguales. Un renglón del banco puede corresponder a dos hechos del libro, o
 * al revés; lo que tiene que ser igual es la suma. Si no lo es, no se cruza.
 *
 * Lo que este paso todavía no hace —registrar el 4×1000, completar la
 * diferencia, anotar el error del banco, importar el extracto de un archivo—
 * está en el paso 1b de `docs/planes/cierre-20-sep.md`, contra endpoints que
 * ya existen.
 */
export function ConciliacionSeccion() {
  const queryClient = useQueryClient();
  const puedeOperar = useTieneRol("CONTADOR", "DIRECTOR");

  const [cuenta, setCuenta] = useState<CuentaBancariaResumen | null>(null);
  const [extractoId, setExtractoId] = useState<string | null>(null);
  const [propuestasElegidas, setPropuestasElegidas] = useState<Set<string>>(new Set());
  const [movimientosElegidos, setMovimientosElegidos] = useState<Set<string>>(new Set());
  const [lineasElegidas, setLineasElegidas] = useState<Set<string>>(new Set());

  const { data: extractos } = useQuery({
    queryKey: ["extractos", cuenta?.id],
    queryFn: () => extractosApi.listar(cuenta!.id),
    enabled: cuenta !== null,
  });
  const abiertos = extractos?.datos.filter((e) => e.estado === "ABIERTO") ?? [];

  const claveDetalle = ["extractos", "detalle", extractoId];
  const { data: detalle, isLoading: cargandoDetalle } = useQuery({
    queryKey: claveDetalle,
    queryFn: () => extractosApi.porId(extractoId!),
    enabled: extractoId !== null,
  });

  const clavePropuestas = ["extractos", "propuestas", extractoId];
  const { data: propuestas, isLoading: cargandoPropuestas } = useQuery({
    queryKey: clavePropuestas,
    queryFn: () => extractosApi.propuestas(extractoId!),
    enabled: extractoId !== null,
  });

  const claveMovimientos = ["cuentas-bancarias", "movimientos", cuenta?.id];
  const { data: movimientos, isLoading: cargandoMovimientos } = useQuery({
    queryKey: claveMovimientos,
    queryFn: () => movimientosBancoApi.listar(cuenta!.id),
    enabled: cuenta !== null,
  });

  const refrescar = async () => {
    await queryClient.invalidateQueries({ queryKey: claveDetalle });
    await queryClient.invalidateQueries({ queryKey: clavePropuestas });
    await queryClient.invalidateQueries({ queryKey: claveMovimientos });
    setPropuestasElegidas(new Set());
    setMovimientosElegidos(new Set());
    setLineasElegidas(new Set());
  };

  const conciliar = useMutation({
    mutationFn: (grupos: GrupoConciliacionInput[]) =>
      extractosApi.conciliar(extractoId!, { grupos }),
    onSuccess: async (_vacio, grupos) => {
      await refrescar();
      aviso.exito(`${grupos.length} cruce${grupos.length === 1 ? "" : "s"} confirmado${grupos.length === 1 ? "" : "s"}`);
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const deshacer = useMutation({
    mutationFn: (grupoId: string) => extractosApi.deshacer(extractoId!, grupoId),
    onSuccess: async () => {
      await refrescar();
      aviso.exito("Cruce deshecho");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const cerrar = useMutation({
    mutationFn: () => extractosApi.cerrar(extractoId!),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["extractos", cuenta?.id] });
      await refrescar();
      aviso.exito("Extracto conciliado");
      setExtractoId(null);
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const trabajando =
    conciliar.isPending || deshacer.isPending || cerrar.isPending;

  // Solo lo conciliable: el saldo inicial no se cruza contra nada.
  const movimientosDeLaCuenta = useMemo(
    () => (movimientos?.datos ?? []).filter((m) => m.tipo !== "SALDO_INICIAL"),
    [movimientos],
  );
  const lineasDelExtracto = useMemo(() => detalle?.lineas ?? [], [detalle]);
  const grupos = detalle?.grupos ?? [];

  const porLinea = useMemo(
    () => new Map(lineasDelExtracto.map((l) => [l.id, l])),
    [lineasDelExtracto],
  );
  const porMovimiento = useMemo(
    () => new Map(movimientosDeLaCuenta.map((m) => [m.id, m])),
    [movimientosDeLaCuenta],
  );

  /**
   * Lo que dice el banco menos lo que dice el libro, de lo elegido a mano. En
   * cero, el grupo cuadra y se puede cruzar; si no, el backend lo rechazaría
   * igual, así que el número se muestra antes de intentarlo.
   */
  const diferencia = useMemo(() => {
    const banco = [...lineasElegidas].reduce(
      (t, id) => t + valorConSignoDeLinea(porLinea.get(id)),
      0,
    );
    const libro = [...movimientosElegidos].reduce(
      (t, id) => t + valorConSignoDeMovimiento(porMovimiento.get(id)),
      0,
    );
    return redondear(banco - libro);
  }, [lineasElegidas, movimientosElegidos, porLinea, porMovimiento]);

  const hayEleccionManual = lineasElegidas.size > 0 && movimientosElegidos.size > 0;
  const cuadraLoElegido = hayEleccionManual && diferencia === 0;

  const confirmarPropuestas = () => {
    const elegidas = (propuestas?.propuestas ?? []).filter((p) =>
      propuestasElegidas.has(clave(p.lineaId, p.movimientoId)),
    );
    conciliar.mutate(
      elegidas.map((p) => ({
        lineaIds: [p.lineaId],
        movimientoIds: [p.movimientoId],
        criterio: p.criterio,
      })),
    );
  };

  const cruzarAMano = () =>
    conciliar.mutate([
      {
        lineaIds: [...lineasElegidas],
        movimientoIds: [...movimientosElegidos],
        criterio: "MANUAL",
      },
    ]);

  const sinPropuestas = (propuestas?.propuestas.length ?? 0) === 0;
  const lineasSueltas = propuestas?.lineasSueltas.length ?? 0;
  const movimientosSueltos = propuestas?.movimientosSueltos.length ?? 0;
  const quedanSueltos = lineasSueltas > 0 || movimientosSueltos > 0;

  return (
    <>
      <section className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex min-w-[280px] flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Cuenta bancaria</span>
          <SelectorCuentaBancaria
            valor={cuenta}
            onElegir={(c) => {
              setCuenta(c);
              setExtractoId(null);
            }}
          />
        </div>

        {cuenta && (
          <label className="flex min-h-12 min-w-[260px] flex-col justify-center rounded-2xl border border-border bg-card px-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Extracto abierto</span>
            <Select items={abiertos.map((e) => ({ value: e.id, label: `${formatFecha(e.fecha_desde)} – ${formatFecha(e.fecha_hasta)}` }))} value={extractoId ?? ""} onValueChange={setExtractoId}>
              <SelectTrigger className="h-auto border-0 bg-transparent p-0 text-sm font-semibold shadow-none">
                <SelectValue placeholder="Elegí un extracto" />
              </SelectTrigger>
              <SelectContent>
                {abiertos.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {formatFecha(e.fecha_desde)} – {formatFecha(e.fecha_hasta)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        )}

        {extractoId && puedeOperar && (
          <Button
            type="button"
            disabled={trabajando || quedanSueltos}
            onClick={() => cerrar.mutate()}
            className="h-auto min-h-12 gap-2 rounded-2xl px-5 text-sm font-semibold"
          >
            {cerrar.isPending && <Loader2 className="size-4 animate-spin" />}
            Cerrar extracto
          </Button>
        )}
      </section>

      {!extractoId ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card px-6 py-20 text-center">
          <CheckCircle2 className="size-8 text-muted-foreground" />
          <p className="font-semibold">
            {cuenta ? "Elegí un extracto abierto para conciliar" : "Elegí una cuenta bancaria para empezar"}
          </p>
        </div>
      ) : (
        <>
          {/*
            Lo que falta se cuenta, no se esconde: una pantalla que no dice
            cuántas líneas quedaron sueltas miente por omisión.
          */}
          <dl className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Cuenta rotulo="Cruces propuestos" valor={propuestas?.propuestas.length ?? 0} />
            <Cuenta
              rotulo="Con más de un candidato"
              valor={propuestas?.ambiguas.length ?? 0}
              nota="Elige una persona"
            />
            <Cuenta rotulo="Líneas sueltas" valor={lineasSueltas} />
            <Cuenta rotulo="Movimientos sueltos" valor={movimientosSueltos} />
          </dl>

          {(propuestas?.porRegla.length ?? 0) > 0 && (
            <p className="mb-5 rounded-2xl border border-border bg-muted px-5 py-4 text-sm text-muted-foreground">
              {propuestas!.porRegla.length} grupo
              {propuestas!.porRegla.length === 1 ? "" : "s"} de líneas que una regla
              reconoce —{propuestas!.porRegla.map((r) => r.nombre).join(", ")}—.
              Registrarlas en un gesto es el paso siguiente; por ahora se cruzan a
              mano.
            </p>
          )}

          <section className="mb-5 overflow-hidden rounded-3xl border border-border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
              <div>
                <h3 className="font-semibold">Lo que el sistema propone</h3>
                <p className="text-xs text-muted-foreground">
                  Propone; no concilia. Revisá y confirmá lo que sea cierto.
                </p>
              </div>
              {puedeOperar && !sinPropuestas && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl px-4 text-sm"
                    onClick={() =>
                      setPropuestasElegidas(
                        propuestasElegidas.size === propuestas!.propuestas.length
                          ? new Set()
                          : new Set(propuestas!.propuestas.map((p) => clave(p.lineaId, p.movimientoId))),
                      )
                    }
                  >
                    {propuestasElegidas.size === propuestas!.propuestas.length
                      ? "Ninguno"
                      : "Todos"}
                  </Button>
                  <Button
                    type="button"
                    disabled={propuestasElegidas.size === 0 || trabajando}
                    onClick={confirmarPropuestas}
                    className="h-10 gap-2 rounded-xl px-5 text-sm"
                  >
                    {conciliar.isPending && <Loader2 className="size-4 animate-spin" />}
                    Confirmar {propuestasElegidas.size || ""}
                  </Button>
                </div>
              )}
            </div>

            {cargandoPropuestas ? (
              <div className="flex justify-center py-16 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : sinPropuestas ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                {quedanSueltos
                  ? "No hay nada que proponer: lo que queda suelto no cruza por valor. Aparealo a mano abajo."
                  : "Todo cruzado."}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {propuestas!.propuestas.map((p) => {
                  const k = clave(p.lineaId, p.movimientoId);
                  const linea = porLinea.get(p.lineaId);
                  const movimiento = porMovimiento.get(p.movimientoId);
                  const elegida = propuestasElegidas.has(k);
                  return (
                    <li key={k}>
                      <button
                        type="button"
                        disabled={!puedeOperar}
                        onClick={() => setPropuestasElegidas(alternar(propuestasElegidas, k))}
                        className={cn(
                          "flex w-full items-start gap-4 px-5 py-4 text-left transition-colors",
                          elegida ? "bg-brand/10" : "hover:bg-accent",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border",
                            elegida ? "border-brand bg-brand/20" : "border-border",
                          )}
                          aria-hidden
                        >
                          {elegida && <CheckCircle2 className="size-3.5 text-brand-text" />}
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{p.motivo}</span>
                          <span className="mt-1 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                            <span className="truncate">
                              Banco · {linea ? `${formatFecha(linea.fecha)} — ${linea.descripcion}` : "—"}
                            </span>
                            <span className="truncate">
                              Libro · {movimiento ? `${formatFecha(movimiento.fecha)} — ${movimiento.concepto}` : "—"}
                            </span>
                          </span>
                        </span>

                        <span className="shrink-0 font-mono text-sm font-semibold">
                          {linea ? formatCOP(Number(linea.valor)) : ""}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {puedeOperar && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-muted p-4 text-sm">
              <span className="text-muted-foreground">
                {hayEleccionManual ? (
                  cuadraLoElegido ? (
                    <>
                      {lineasElegidas.size} línea{lineasElegidas.size === 1 ? "" : "s"} y{" "}
                      {movimientosElegidos.size} movimiento
                      {movimientosElegidos.size === 1 ? "" : "s"}: las sumas son iguales.
                    </>
                  ) : (
                    <>
                      Faltan{" "}
                      <span className="font-mono font-semibold text-warning">
                        {formatCOP(Math.abs(diferencia))}
                      </span>{" "}
                      para que cuadre. Una diferencia no se aparea: es un cargo del
                      banco, un error nuestro o un error del banco.
                    </>
                  )
                ) : (
                  "Elegí líneas y movimientos cuyas sumas coincidan para cruzarlos a mano."
                )}
              </span>
              <Button
                type="button"
                disabled={!cuadraLoElegido || trabajando}
                onClick={cruzarAMano}
                className="h-10 rounded-xl px-5 text-sm"
              >
                {conciliar.isPending && <Loader2 className="size-4 animate-spin" />}
                Cruzar a mano
              </Button>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <Columna
              titulo="Libro (movimientos)"
              cargando={cargandoMovimientos}
              vacio="Sin movimientos."
            >
              {movimientosDeLaCuenta.map((m) => (
                <Fila
                  key={m.id}
                  cruzado={m.conciliado}
                  elegida={movimientosElegidos.has(m.id)}
                  puedeOperar={puedeOperar}
                  onClick={() => setMovimientosElegidos(alternar(movimientosElegidos, m.id))}
                  fecha={m.fecha}
                  texto={m.concepto}
                  valor={valorConSignoDeMovimiento(m)}
                />
              ))}
            </Columna>

            <Columna
              titulo="Extracto (líneas)"
              cargando={cargandoDetalle}
              vacio="Sin líneas."
            >
              {lineasDelExtracto.map((l) => (
                <Fila
                  key={l.id}
                  cruzado={l.grupo_id !== null}
                  elegida={lineasElegidas.has(l.id)}
                  puedeOperar={puedeOperar}
                  onClick={() => setLineasElegidas(alternar(lineasElegidas, l.id))}
                  fecha={l.fecha}
                  texto={l.descripcion}
                  nota={l.nota}
                  valor={valorConSignoDeLinea(l)}
                />
              ))}
            </Columna>
          </div>

          {grupos.length > 0 && (
            <section className="mt-5 overflow-hidden rounded-3xl border border-border bg-card">
              <div className="border-b border-border p-5">
                <h3 className="font-semibold">Ya cruzado</h3>
                <p className="text-xs text-muted-foreground">
                  {grupos.length} cruce{grupos.length === 1 ? "" : "s"} vigente
                  {grupos.length === 1 ? "" : "s"}. Apareado mal ya no es apareado
                  para siempre.
                </p>
              </div>
              <ul className="divide-y divide-border">
                {grupos.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="min-w-0">
                      <span className="block font-medium">{NOMBRE_CRITERIO[g.criterio]}</span>
                      <span className="block text-xs text-muted-foreground">
                        {g.linea_ids.length} línea{g.linea_ids.length === 1 ? "" : "s"} ·{" "}
                        {g.movimiento_ids.length} movimiento
                        {g.movimiento_ids.length === 1 ? "" : "s"}
                      </span>
                    </span>
                    {puedeOperar && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={trabajando}
                        onClick={() => deshacer.mutate(g.id)}
                        className="h-9 shrink-0 gap-2 rounded-xl px-4 text-xs"
                      >
                        <Link2Off className="size-3.5" />
                        Deshacer
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </>
  );
}

const NOMBRE_CRITERIO: Record<CriterioGrupo, string> = {
  REFERENCIA: "Cruzado por la referencia",
  MISMA_FECHA: "Cruzado por valor y fecha",
  FECHA_CERCANA: "Cruzado por valor, con días de diferencia",
  MANUAL: "Cruzado a mano",
  REGISTRADA: "Registrado desde el extracto",
  ANTERIOR: "De una conciliación anterior",
};

function Cuenta({
  rotulo,
  valor,
  nota,
}: {
  rotulo: string;
  valor: number;
  nota?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4">
      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {rotulo}
      </dt>
      <dd className="mt-1 font-mono text-2xl font-semibold">{valor}</dd>
      {nota && <p className="text-xs text-muted-foreground">{nota}</p>}
    </div>
  );
}

function Columna({
  titulo,
  cargando,
  vacio,
  children,
}: {
  titulo: string;
  cargando: boolean;
  vacio: string;
  children: React.ReactNode[];
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <h3 className="font-semibold">{titulo}</h3>
      </div>
      {cargando ? (
        <div className="flex justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {children}
          {children.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-muted-foreground">{vacio}</li>
          )}
        </ul>
      )}
    </section>
  );
}

function Fila({
  cruzado,
  elegida,
  puedeOperar,
  onClick,
  fecha,
  texto,
  nota,
  valor,
}: {
  cruzado: boolean;
  elegida: boolean;
  puedeOperar: boolean;
  onClick: () => void;
  fecha: string;
  texto: string;
  nota?: string | null;
  valor: number;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={cruzado || !puedeOperar}
        onClick={onClick}
        className={cn(
          "flex w-full items-center justify-between gap-3 px-5 py-3 text-left text-sm transition-colors",
          cruzado ? "opacity-40" : elegida ? "bg-brand/10" : "hover:bg-accent",
        )}
      >
        <span className="min-w-0">
          <span className="block font-medium">{formatFecha(fecha)}</span>
          <span className="block truncate text-xs text-muted-foreground">{texto}</span>
          {nota && <span className="block text-xs text-warning">{nota}</span>}
        </span>
        <span className="shrink-0 font-mono font-semibold">
          {valor < 0 ? "-" : ""}
          {formatCOP(Math.abs(valor))}
        </span>
      </button>
    </li>
  );
}

function clave(lineaId: string, movimientoId: string): string {
  return `${lineaId}:${movimientoId}`;
}

function alternar(conjunto: Set<string>, id: string): Set<string> {
  const siguiente = new Set(conjunto);
  if (!siguiente.delete(id)) siguiente.add(id);
  return siguiente;
}

/** Lo que entró al banco suma; lo que salió resta. `CREDITO` es entrada. */
function valorConSignoDeLinea(linea: LineaExtractoResumen | undefined): number {
  if (!linea) return 0;
  return linea.tipo === "CREDITO" ? Number(linea.valor) : -Number(linea.valor);
}

function valorConSignoDeMovimiento(
  movimiento: MovimientoBancoResumen | undefined,
): number {
  if (!movimiento || movimiento.tipo === "SALDO_INICIAL") return 0;
  const direccion = DIRECCION_MOVIMIENTO_BANCO[movimiento.tipo];
  return direccion === "ENTRADA" ? Number(movimiento.valor) : -Number(movimiento.valor);
}

/** Los pesos llevan dos decimales: comparar en centavos evita el 0.00000001. */
function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}
