"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Flag, Link2Off, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  DialogoNotaBanco,
  type DatosNotaBanco,
} from "../components/DialogoNotaBanco";
import { DialogoRegistrarRegla } from "../components/DialogoRegistrarRegla";
import { SelectorCuentaBancaria } from "../components/SelectorCuentaBancaria";
import { estadoDelCierre } from "../lib/conciliacion";
import { nombreCuenta, useCuentasContables } from "../lib/useCuentasContables";
import { extractosApi, movimientosBancoApi } from "../services/bancos.service";
import {
  DIRECCION_MOVIMIENTO_BANCO,
  type CriterioGrupo,
  type CuentaBancariaResumen,
  type GrupoConciliacionInput,
  type LineaExtractoResumen,
  type MovimientoBancoResumen,
  type RegistrarDesdeExtractoInput,
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
 * Cerrar exige lo mismo que el backend: toda línea del banco cruzada o anotada
 * como error del banco. Lo suelto del libro es partida de tiempo y se espera.
 *
 * Una diferencia no se cruza: se registra (cargo o abono del banco, error
 * nuestro, con `completar`) o se anota como error del banco. Lo que el banco
 * hizo solo —4×1000, comisiones— se registra con `registrar`, por una regla
 * que lo reconoce o a mano; en los dos casos, con un segundo clic.
 */
export function ConciliacionSeccion() {
  const queryClient = useQueryClient();
  const puedeOperar = useTieneRol("CONTADOR", "DIRECTOR");

  const [cuenta, setCuenta] = useState<CuentaBancariaResumen | null>(null);
  const [extractoId, setExtractoId] = useState<string | null>(null);
  const [propuestasCrudas, setPropuestasElegidas] = useState<Set<string>>(new Set());
  const [movimientosCrudos, setMovimientosElegidos] = useState<Set<string>>(new Set());
  const [lineasCrudas, setLineasElegidas] = useState<Set<string>>(new Set());
  // La línea a la que se le está escribiendo el porqué del error del banco.
  const [anotando, setAnotando] = useState<string | null>(null);
  const [textoNota, setTextoNota] = useState("");
  // Cuál de las salidas de una diferencia se está registrando, si alguna.
  const [salida, setSalida] = useState<"BANCO" | "ERROR_NUESTRO" | null>(null);
  // Registrar lo que el banco hizo solo: por una regla, o a mano con las líneas elegidas.
  const [registrando, setRegistrando] = useState<
    { por: "REGLA"; reglaId: string } | { por: "MANO" } | null
  >(null);

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

  // El sufijo la separa del libro entero (`LibroBancoSeccion`), que es otra
  // consulta; invalidar por el prefijo refresca las dos, y un cruce cambia
  // `conciliado` en ambas.
  const claveMovimientos = ["cuentas-bancarias", "movimientos", cuenta?.id];
  const { data: movimientos, isLoading: cargandoMovimientos } = useQuery({
    queryKey: [...claveMovimientos, "por-conciliar"],
    queryFn: () => movimientosBancoApi.porConciliar(cuenta!.id),
    enabled: cuenta !== null,
  });

  /** Otra cuenta u otro extracto: nada de lo elegido ni de lo abierto sigue valiendo. */
  const empezarDeNuevo = () => {
    setPropuestasElegidas(new Set());
    setMovimientosElegidos(new Set());
    setLineasElegidas(new Set());
    setAnotando(null);
    setSalida(null);
    setRegistrando(null);
  };

  const refrescar = async () => {
    await queryClient.invalidateQueries({ queryKey: claveDetalle });
    await queryClient.invalidateQueries({ queryKey: clavePropuestas });
    // Todo lo de la cuenta, no solo sus movimientos: registrar y completar
    // crean notas que cambian el saldo del selector, de la lista y del corte.
    await queryClient.invalidateQueries({ queryKey: ["cuentas-bancarias"] });
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

  const anotar = useMutation({
    mutationFn: ({ lineaId, nota }: { lineaId: string; nota: string | null }) =>
      extractosApi.anotarLinea(extractoId!, lineaId, nota),
    onSuccess: async (_vacio, { nota }) => {
      await refrescar();
      setAnotando(null);
      setTextoNota("");
      aviso.exito(nota === null ? "Nota quitada" : "Anotada como error del banco");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const completar = useMutation({
    mutationFn: (datos: DatosNotaBanco & { lineaIds: string[]; movimientoIds: string[] }) =>
      extractosApi.completar(extractoId!, datos),
    onSuccess: async () => {
      await refrescar();
      setSalida(null);
      aviso.exito("Diferencia registrada y cruce completo");
    },
    onError: (e: unknown) => aviso.falla(e),
  });

  const registrar = useMutation({
    mutationFn: (datos: RegistrarDesdeExtractoInput) =>
      extractosApi.registrar(extractoId!, datos),
    onSuccess: async ({ registradas }) => {
      await refrescar();
      setRegistrando(null);
      aviso.exito(
        `${registradas} línea${registradas === 1 ? "" : "s"} registrada${registradas === 1 ? "" : "s"} en el libro`,
      );
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
    conciliar.isPending ||
    deshacer.isPending ||
    anotar.isPending ||
    completar.isPending ||
    registrar.isPending ||
    cerrar.isPending;

  // Ya viene solo lo conciliable: sin cruce y sin el saldo inicial. Lo cruzado
  // se ve en «Ya cruzado», no dos veces.
  const movimientosDeLaCuenta = useMemo(() => movimientos?.datos ?? [], [movimientos]);
  const movimientosSinMostrar = (movimientos?.total ?? 0) - movimientosDeLaCuenta.length;
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

  /*
   * Lo elegido que todavía se puede usar. Lo crudo puede quedar viejo: un
   * refetch trae cruzada o anotada una línea que estaba elegida, o la trajo
   * otro extracto. Si se usara tal cual, la barra contaría filas que no se ven
   * y el pedido llevaría ids que el backend rechaza. Todo lo de abajo mira
   * solo esto.
   */
  const lineasElegidas = useMemo(
    () =>
      new Set(
        [...lineasCrudas].filter((id) => {
          const l = porLinea.get(id);
          return l !== undefined && l.grupo_id === null && !l.nota;
        }),
      ),
    [lineasCrudas, porLinea],
  );
  const movimientosElegidos = useMemo(
    () => new Set([...movimientosCrudos].filter((id) => porMovimiento.has(id))),
    [movimientosCrudos, porMovimiento],
  );
  const propuestasElegidas = useMemo(() => {
    const vigentes = new Set(
      (propuestas?.propuestas ?? []).map((p) => clave(p.lineaId, p.movimientoId)),
    );
    return new Set([...propuestasCrudas].filter((k) => vigentes.has(k)));
  }, [propuestasCrudas, propuestas]);

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

  const porRegla = (propuestas?.porRegla ?? []).filter((r) => r.lineaIds.length > 0);
  const cuentasContables = useCuentasContables(porRegla.length > 0);
  const reglaARegistrar =
    registrando?.por === "REGLA"
      ? porRegla.find((r) => r.reglaId === registrando.reglaId)
      : undefined;

  const hayEleccionManual = lineasElegidas.size > 0 && movimientosElegidos.size > 0;
  // Líneas del banco sin nada del libro al lado: lo que el banco hizo solo.
  const soloLineas = lineasElegidas.size > 0 && movimientosElegidos.size === 0;
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
  // En tránsito es lo del libro hasta el cierre del extracto que el banco
  // todavía no muestra. Los sueltos traen también lo de después (hasta 45
  // días, por si cruzan por referencia), y eso no es de este extracto.
  const enTransito = (propuestas?.movimientosSueltos ?? []).filter((id) => {
    const fecha = porMovimiento.get(id)?.fecha;
    return !detalle || fecha === undefined || fecha <= detalle.fecha_hasta;
  }).length;
  const quedanSueltos = lineasSueltas > 0 || movimientosSueltos > 0;

  const {
    sinExplicar: lineasSinExplicar,
    porReclamar: lineasPorReclamar,
    sePuedeCerrar,
  } = estadoDelCierre(lineasDelExtracto);

  const textoNotaLimpio = textoNota.trim();
  const notaValida = textoNotaLimpio.length >= 3 && textoNotaLimpio.length <= 300;

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
              empezarDeNuevo();
            }}
          />
        </div>

        {cuenta && (
          <label className="flex min-h-12 min-w-[260px] flex-col justify-center rounded-2xl border border-border bg-card px-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Extracto abierto</span>
            <Select items={abiertos.map((e) => ({ value: e.id, label: `${formatFecha(e.fecha_desde)} – ${formatFecha(e.fecha_hasta)}` }))} value={extractoId ?? ""} onValueChange={(id) => {
              setExtractoId(id);
              empezarDeNuevo();
            }}>
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
            disabled={trabajando || cargandoDetalle || !sePuedeCerrar}
            title={
              lineasSinExplicar > 0
                ? `Falta explicar ${lineasSinExplicar} línea${lineasSinExplicar === 1 ? "" : "s"} del banco`
                : undefined
            }
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
          <dl className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Cuenta rotulo="Cruces propuestos" valor={propuestas?.propuestas.length ?? 0} />
            <Cuenta
              rotulo="Con más de un candidato"
              valor={propuestas?.ambiguas.length ?? 0}
              nota="Elige una persona"
            />
            <Cuenta
              rotulo="Líneas sin explicar"
              valor={lineasSinExplicar}
              nota={lineasSinExplicar > 0 ? "Impiden cerrar" : "Nada impide cerrar"}
              alerta={lineasSinExplicar > 0}
            />
            <Cuenta
              rotulo="Por reclamar al banco"
              valor={lineasPorReclamar}
              nota="Errores del banco, anotados"
            />
            <Cuenta
              rotulo="En tránsito en el libro"
              valor={enTransito}
              nota="Se esperan: no impiden cerrar"
            />
          </dl>

          {porRegla.length > 0 && (
            <section className="mb-5 overflow-hidden rounded-3xl border border-border bg-card">
              <div className="border-b border-border p-5">
                <h3 className="font-semibold">Lo que el banco hizo solo</h3>
                <p className="text-xs text-muted-foreground">
                  Líneas que una regla del extracto reconoce. Registrarlas crea una nota
                  por línea, con la fecha y el valor del banco, y las deja cruzadas.
                </p>
              </div>
              <ul className="divide-y divide-border">
                {porRegla.map((r) => (
                  <li key={r.reglaId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span className="min-w-0">
                      <span className="block font-medium">
                        {r.lineaIds.length} línea{r.lineaIds.length === 1 ? "" : "s"} de {r.nombre}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {nombreCuenta(cuentasContables.get(r.contraCuentaId))}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-mono font-semibold">{formatCOP(Number(r.total))}</span>
                      {puedeOperar && (
                        <Button
                          type="button"
                          disabled={trabajando}
                          onClick={() => setRegistrando({ por: "REGLA", reglaId: r.reglaId })}
                          className="h-9 rounded-xl px-4 text-xs"
                        >
                          Registrar las {r.lineaIds.length}
                        </Button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
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
                      El banco dice{" "}
                      <span className="font-mono font-semibold text-warning">
                        {formatCOP(Math.abs(diferencia))}
                      </span>{" "}
                      {diferencia < 0 ? "menos" : "más"} que el libro: ¿qué es? Una
                      diferencia no se aparea; se registra o se reclama.
                    </>
                  )
                ) : soloLineas ? (
                  <>
                    {lineasElegidas.size} línea{lineasElegidas.size === 1 ? "" : "s"} del
                    banco sin nada del libro al lado. Si el banco la
                    {lineasElegidas.size === 1 ? "" : "s"} hizo solo —una comisión, un
                    interés—, registrala{lineasElegidas.size === 1 ? "" : "s"} en el libro.
                  </>
                ) : (
                  "Elegí líneas y movimientos cuyas sumas coincidan para cruzarlos a mano."
                )}
              </span>
              {hayEleccionManual && !cuadraLoElegido ? (
                /* Las tres salidas de la decisión 2 del paso 16. */
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={trabajando}
                    onClick={() => setSalida("BANCO")}
                    className="h-10 rounded-xl px-4 text-sm"
                  >
                    {diferencia < 0 ? "Cargo del banco" : "Abono del banco"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={trabajando}
                    onClick={() => setSalida("ERROR_NUESTRO")}
                    className="h-10 rounded-xl px-4 text-sm"
                  >
                    Error nuestro
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    // La nota es por línea: con varias no se sabe cuál reclamar.
                    disabled={trabajando || lineasElegidas.size !== 1}
                    title={lineasElegidas.size !== 1 ? "Se anota una línea a la vez: elegí una sola" : undefined}
                    onClick={() => {
                      setAnotando([...lineasElegidas][0]);
                      setTextoNota("");
                    }}
                    className="h-10 gap-1.5 rounded-xl px-4 text-sm"
                  >
                    <Flag className="size-3.5" />
                    Error del banco
                  </Button>
                </div>
              ) : soloLineas ? (
                <Button
                  type="button"
                  disabled={trabajando}
                  onClick={() => setRegistrando({ por: "MANO" })}
                  className="h-10 rounded-xl px-5 text-sm"
                >
                  Registrar en el libro
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={!cuadraLoElegido || trabajando}
                  onClick={cruzarAMano}
                  className="h-10 rounded-xl px-5 text-sm"
                >
                  {conciliar.isPending && <Loader2 className="size-4 animate-spin" />}
                  Cruzar a mano
                </Button>
              )}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <Columna
              titulo="Libro (por conciliar)"
              cargando={cargandoMovimientos}
              vacio="Nada por conciliar en el libro."
              ayuda="Lo que el banco todavía no muestra —consignaciones en tránsito, cheques sin cobrar— se espera al extracto siguiente."
              nota={
                movimientosSinMostrar > 0
                  ? `Se muestran ${movimientosDeLaCuenta.length} de ${movimientos!.total}: los más recientes.`
                  : undefined
              }
            >
              {movimientosDeLaCuenta.map((m) => (
                <Fila
                  key={m.id}
                  cruzado={false}
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
              {lineasDelExtracto.map((l) => {
                const suelta = l.grupo_id === null;
                // Una línea anotada no se cruza: primero se le quita la nota.
                // Si no, quedaría cruzada y diciendo «error del banco».
                const anotada = suelta && !!l.nota;
                return (
                  <Fila
                    key={l.id}
                    cruzado={!suelta}
                    bloqueada={anotada}
                    elegida={lineasElegidas.has(l.id)}
                    puedeOperar={puedeOperar}
                    onClick={() => setLineasElegidas(alternar(lineasElegidas, l.id))}
                    fecha={l.fecha}
                    texto={l.descripcion}
                    nota={l.nota ? `Por reclamar: ${l.nota}` : null}
                    valor={valorConSignoDeLinea(l)}
                    acciones={
                      puedeOperar && suelta && anotando !== l.id ? (
                        anotada ? (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={trabajando}
                            onClick={() => anotar.mutate({ lineaId: l.id, nota: null })}
                            className="h-8 rounded-lg px-3 text-xs"
                          >
                            Quitar nota
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={trabajando}
                            onClick={() => {
                              setAnotando(l.id);
                              setTextoNota("");
                            }}
                            className="h-8 gap-1.5 rounded-lg px-3 text-xs"
                          >
                            <Flag className="size-3" />
                            Error del banco
                          </Button>
                        )
                      ) : undefined
                    }
                    debajo={
                      anotando === l.id ? (
                        <form
                          className="flex flex-col gap-2 px-5 pb-4"
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (notaValida) anotar.mutate({ lineaId: l.id, nota: textoNotaLimpio });
                          }}
                        >
                          <label htmlFor={`nota-${l.id}`} className="text-xs text-muted-foreground">
                            ¿Qué hizo mal el banco? La línea queda sin cruzar y se le reclama; el libro no se toca.
                          </label>
                          <div className="flex gap-2">
                            <Input
                              id={`nota-${l.id}`}
                              autoFocus
                              maxLength={300}
                              value={textoNota}
                              onChange={(e) => setTextoNota(e.target.value)}
                              placeholder="Cobró dos veces la comisión"
                              className="h-9 rounded-lg text-sm"
                            />
                            <Button
                              type="submit"
                              disabled={!notaValida || trabajando}
                              className="h-9 gap-2 rounded-lg px-4 text-xs"
                            >
                              {anotar.isPending && <Loader2 className="size-3.5 animate-spin" />}
                              Anotar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setAnotando(null)}
                              className="h-9 rounded-lg px-3 text-xs"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </form>
                      ) : undefined
                    }
                  />
                );
              })}
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

      {salida !== null && (
        <DialogoNotaBanco
          titulo={
            salida === "BANCO"
              ? diferencia < 0
                ? "Cargo del banco"
                : "Abono del banco"
              : "Error nuestro"
          }
          descripcion={
            salida === "BANCO"
              ? "Lo que el banco cobró o abonó y el libro no tenía. El soporte es el extracto."
              : "El libro registró mal este hecho. No se edita: esta nota lo corrige."
          }
          resumen={
            <>
              Se registra una <strong>nota {diferencia < 0 ? "débito" : "crédito"}</strong> por{" "}
              <span className="font-mono font-semibold">{formatCOP(Math.abs(diferencia))}</span>{" "}
              con fecha {formatFecha(fechaDeLaDiferencia(lineasElegidas, porLinea))}, y queda
              cruzado todo junto: {lineasElegidas.size} línea
              {lineasElegidas.size === 1 ? "" : "s"} del banco con {movimientosElegidos.size}{" "}
              movimiento{movimientosElegidos.size === 1 ? "" : "s"} y la nota.
            </>
          }
          ayudaCuenta={
            salida === "BANCO"
              ? "El gasto o el ingreso: comisión, 4×1000, intereses."
              : "La cuenta contra la que quedó mal registrado."
          }
          guardando={completar.isPending}
          onConfirmar={(datos) =>
            completar.mutate({
              ...datos,
              lineaIds: [...lineasElegidas],
              movimientoIds: [...movimientosElegidos],
            })
          }
          onCerrar={() => setSalida(null)}
        />
      )}

      {registrando?.por === "MANO" && (
        <DialogoNotaBanco
          titulo="Registrar en el libro"
          descripcion="Lo que el banco hizo solo y el libro no tenía. El soporte es el extracto."
          resumen={<ResumenRegistro lineas={[...lineasElegidas].map((id) => porLinea.get(id)!)} />}
          ayudaCuenta="El gasto o el ingreso: comisión, cuota de manejo, intereses."
          guardando={registrar.isPending}
          onConfirmar={(datos) => registrar.mutate({ ...datos, lineaIds: [...lineasElegidas] })}
          onCerrar={() => setRegistrando(null)}
        />
      )}

      {reglaARegistrar && (
        <DialogoRegistrarRegla
          regla={reglaARegistrar}
          lineas={reglaARegistrar.lineaIds.flatMap((id) => porLinea.get(id) ?? [])}
          cuenta={cuentasContables.get(reglaARegistrar.contraCuentaId)}
          guardando={registrar.isPending}
          onConfirmar={() =>
            registrar.mutate({
              lineaIds: reglaARegistrar.lineaIds,
              contraCuentaId: reglaARegistrar.contraCuentaId,
              concepto: reglaARegistrar.concepto,
            })
          }
          onCerrar={() => setRegistrando(null)}
        />
      )}
    </>
  );
}

/** Qué va a quedar en el libro al registrar unas líneas: una nota por cada una. */
function ResumenRegistro({ lineas }: { lineas: LineaExtractoResumen[] }) {
  const debitos = lineas.filter((l) => l.tipo === "DEBITO");
  const creditos = lineas.filter((l) => l.tipo === "CREDITO");
  const suma = (ls: LineaExtractoResumen[]) => ls.reduce((t, l) => t + Number(l.valor), 0);
  return (
    <>
      Se registra una nota por línea, con la fecha y el valor que dice el banco, y
      cada una queda cruzada con su línea:
      <ul className="mt-2 list-disc pl-5">
        {debitos.length > 0 && (
          <li>
            {debitos.length} nota{debitos.length === 1 ? "" : "s"} débito por{" "}
            <span className="font-mono font-semibold">{formatCOP(suma(debitos))}</span>
          </li>
        )}
        {creditos.length > 0 && (
          <li>
            {creditos.length} nota{creditos.length === 1 ? "" : "s"} crédito por{" "}
            <span className="font-mono font-semibold">{formatCOP(suma(creditos))}</span>
          </li>
        )}
      </ul>
    </>
  );
}

/** La fecha que usa `completar`: la última de las líneas del banco en el cruce. */
function fechaDeLaDiferencia(
  lineaIds: Set<string>,
  porLinea: Map<string, LineaExtractoResumen>,
): string {
  return [...lineaIds]
    .map((id) => porLinea.get(id)?.fecha ?? "")
    .sort()
    .at(-1)!;
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
  alerta = false,
}: {
  rotulo: string;
  valor: number;
  nota?: string;
  alerta?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card px-5 py-4",
        alerta ? "border-warning" : "border-border",
      )}
    >
      <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {rotulo}
      </dt>
      <dd className={cn("mt-1 font-mono text-2xl font-semibold", alerta && "text-warning")}>
        {valor}
      </dd>
      {nota && <p className="text-xs text-muted-foreground">{nota}</p>}
    </div>
  );
}

function Columna({
  titulo,
  cargando,
  vacio,
  ayuda,
  nota,
  children,
}: {
  titulo: string;
  cargando: boolean;
  vacio: string;
  ayuda?: string;
  /** Lo que la lista no alcanza a mostrar, dicho: cortar callado es mentir. */
  nota?: string;
  children: React.ReactNode[];
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card">
      <div className="border-b border-border p-5">
        <h3 className="font-semibold">{titulo}</h3>
        {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
        {nota && <p className="text-xs text-warning">{nota}</p>}
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

/**
 * Un renglón que se elige para cruzar. Las acciones van al lado del botón y no
 * adentro: un botón dentro de otro no es HTML válido, y el clic de la acción
 * también elegiría la fila.
 */
function Fila({
  cruzado,
  bloqueada = false,
  elegida,
  puedeOperar,
  onClick,
  fecha,
  texto,
  nota,
  valor,
  acciones,
  debajo,
}: {
  cruzado: boolean;
  /** Sin cruzar, pero no se puede elegir: una línea anotada como error del banco. */
  bloqueada?: boolean;
  elegida: boolean;
  puedeOperar: boolean;
  onClick: () => void;
  fecha: string;
  texto: string;
  nota?: string | null;
  valor: number;
  acciones?: React.ReactNode;
  debajo?: React.ReactNode;
}) {
  return (
    <li className={cn(elegida && "bg-brand/10")}>
      <div className="flex items-center gap-2 pr-5">
        <button
          type="button"
          disabled={cruzado || bloqueada || !puedeOperar}
          onClick={onClick}
          className={cn(
            "flex min-w-0 flex-1 items-center justify-between gap-3 py-3 pl-5 text-left text-sm transition-colors",
            cruzado ? "opacity-40" : !elegida && !bloqueada && "hover:bg-accent",
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
        {acciones}
      </div>
      {debajo}
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
