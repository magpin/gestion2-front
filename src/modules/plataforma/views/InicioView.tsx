"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { buttonVariants } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { BotonBuscar } from "../components/BotonBuscar";
import {
  Cifra,
  Encabezado,
  ErrorCarga,
  EsqueletoPagina,
  Mono,
  Pastilla,
  SinConfigurar,
  Tarjeta,
  Td,
  Th,
} from "../components/piezas";
import {
  diaLargo,
  dolares,
  entero,
  fecha,
  hora,
  lista,
  nombreMes,
  pesos,
  plural,
  porciento,
} from "../lib/formato";
import { useTasa } from "../lib/tasa";
import { plataformaService } from "../services/plataforma.service";
import { NOMBRE_DOCUMENTO, type EstadoCuenta, type Inicio } from "../types/plataforma.types";

type Tono = "peligro" | "advertencia" | "marca" | "info" | "neutro";

const PUNTO: Record<Tono, string> = {
  peligro: "bg-danger",
  advertencia: "bg-warning",
  marca: "bg-brand",
  info: "bg-info",
  neutro: "bg-muted-foreground",
};

interface Pendiente {
  clave: string;
  tono: Tono;
  titulo: string;
  detalle: string;
  accion: { texto: string; href: string };
}

/**
 * Lo que hay que atender hoy, en el orden en que conviene atenderlo. Cada uno
 * con su acción: si un pendiente no lleva a ningún lado, no es un pendiente.
 */
export function armarPendientes(p: Inicio["pendientes"]): Pendiente[] {
  const lista_: Pendiente[] = [];

  if (p.morosas.length > 0) {
    const sinCobrar = p.morosas.reduce((s, m) => s + m.vencido, 0);
    const una = p.morosas[0];
    lista_.push({
      clave: "morosas",
      tono: "peligro",
      titulo:
        p.morosas.length === 1
          ? `${una.nombre} lleva ${una.dias} días sin pagar`
          : `${plural(p.morosas.length, "cuenta")} morosas`,
      detalle:
        (sinCobrar > 0 ? `${pesos(sinCobrar)} sin cobrar. ` : "") +
        (p.morosas.length === 1
          ? "Se puede suspender desde su detalle."
          : `La más antigua lleva ${una.dias} días.`),
      accion:
        p.morosas.length === 1
          ? { texto: "Ver la cuenta", href: `/plataforma/cuentas/${una.id}?pestana=suscripcion` }
          : { texto: "Ver cuentas", href: "/plataforma/cuentas?filtro=MOROSAS" },
    });
  }

  if (p.pagosVencidos.length > 0) {
    const c = p.pagosVencidos[0];
    const vencido = p.pagosVencidos.reduce((s, m) => s + m.vencido, 0);
    lista_.push({
      clave: "vencidos",
      tono: "advertencia",
      titulo:
        p.pagosVencidos.length === 1
          ? `${c.nombre} tiene el pago vencido hace ${plural(c.dias, "día")}`
          : `${plural(p.pagosVencidos.length, "cuenta")} con el pago vencido`,
      detalle: `${pesos(vencido)} vencido. A los 15 días pasan solas a morosas.`,
      accion: { texto: "Registrar un pago", href: `/plataforma/cuentas/${c.id}?pestana=suscripcion` },
    });
  }

  if (p.cercaCupo.length > 0) {
    const c = p.cercaCupo[0];
    lista_.push({
      clave: "cupo",
      tono: "advertencia",
      titulo:
        p.cercaCupo.length === 1
          ? `${c.nombre} está al 90 % de su cupo`
          : `${plural(p.cercaCupo.length, "cuenta")} al 90 % de su cupo`,
      detalle: `${c.nombre} tiene ${c.usados} de ${c.max} ${
        c.recurso === "USUARIOS" ? "usuarios" : "empresas"
      }.`,
      accion: {
        texto: "Revisar cupos",
        href:
          p.cercaCupo.length === 1
            ? `/plataforma/cuentas/${c.id}`
            : "/plataforma/cuentas?filtro=CERCA_CUPO",
      },
    });
  }

  if (p.iaDisparada.length > 0) {
    const e = p.iaDisparada[0];
    const veces = e.veces.toLocaleString("es-CO", { maximumFractionDigits: 1 });
    lista_.push({
      clave: "ia",
      tono: "marca",
      titulo:
        p.iaDisparada.length === 1
          ? `${e.empresa} gastó ${veces} veces su promedio de IA`
          : `${plural(p.iaDisparada.length, "empresa")} gastan más de 3 veces su promedio de IA`,
      detalle: `${e.empresa}: ${dolares(e.costoUsd)} este mes, contra un promedio de ${dolares(
        e.promedioUsd,
      )} al mes.`,
      accion: { texto: "Ver consumo", href: `/plataforma/consumo-ia?cuenta=${e.cuentaId}` },
    });
  }

  const fallidas = p.lecturasFallidas.reduce((s, l) => s + l.cantidad, 0);
  if (fallidas > 0) {
    lista_.push({
      clave: "lecturas",
      tono: "peligro",
      titulo:
        fallidas === 1
          ? "1 lectura de documentos falló hoy"
          : `${entero(fallidas)} lecturas de documentos fallaron hoy`,
      detalle: `${lista(
        p.lecturasFallidas.map((l) => `${l.cantidad} ${NOMBRE_DOCUMENTO[l.tipo] ?? l.tipo}`),
      )}.`,
      accion: { texto: "Ver consumo", href: "/plataforma/consumo-ia" },
    });
  }

  if (p.sinConfigurar.length > 0) {
    const c = p.sinConfigurar[0];
    const falta = c.sinEmpresa
      ? "todavía no crea su empresa"
      : `le falta ${lista(c.empresas[0]?.pendientes ?? []).toLowerCase() || "terminar"}`;
    lista_.push({
      clave: "configuracion",
      tono: "info",
      titulo:
        p.sinConfigurar.length === 1
          ? `${c.cuenta} lleva ${c.dias} días sin terminar la configuración`
          : `${plural(p.sinConfigurar.length, "cliente nuevo", "clientes nuevos")} llevan más de una semana sin terminar la configuración`,
      detalle: `A ${c.cuenta} ${falta}.`,
      accion: {
        texto: "Ver empresas",
        href: `/plataforma/cuentas/${c.cuentaId}?pestana=empresas`,
      },
    });
  }

  if (p.sinEntrar.length > 0) {
    const c = p.sinEntrar[0];
    lista_.push({
      clave: "sin-entrar",
      tono: "neutro",
      titulo: `${plural(p.sinEntrar.length, "cuenta")} sin entrar hace 30 días`,
      detalle:
        p.sinEntrar.length === 1
          ? `${c.nombre}, ${c.nuncaEntro ? "que nunca entró" : `hace ${c.dias} días`}.`
          : `${c.nombre} y ${p.sinEntrar.length - 1} más.`,
      accion: { texto: "Ver cuentas", href: "/plataforma/cuentas?filtro=SIN_ACTIVIDAD" },
    });
  }

  return lista_;
}

const configIa = {
  facturado: { label: "Ingreso", color: "var(--chart-2)" },
  ia: { label: "Gasto de IA", color: "var(--chart-1)" },
} satisfies ChartConfig;

const ORDEN_ESTADOS: { clave: EstadoCuenta; texto: string; color: string }[] = [
  { clave: "ACTIVO", texto: "Activas", color: "bg-chart-2" },
  { clave: "MOROSO", texto: "Morosas", color: "bg-warning" },
  { clave: "SUSPENDIDO", texto: "Suspendidas", color: "bg-danger" },
  { clave: "CANCELADO", texto: "Canceladas", color: "bg-chart-4" },
];

export function InicioView() {
  const [tasa] = useTasa();
  const consulta = useQuery({
    queryKey: ["plataforma", "inicio"],
    queryFn: plataformaService.inicio,
  });

  if (consulta.isPending) return <EsqueletoPagina />;
  if (consulta.isError || !consulta.data) {
    return (
      <>
        <Encabezado titulo="Inicio" acciones={<BotonBuscar />} />
        <ErrorCarga que="las cifras de la plataforma" alReintentar={() => void consulta.refetch()} />
      </>
    );
  }

  const d = consulta.data;
  const pendientes = armarPendientes(d.pendientes);
  const mesPasado = nombreMes(
    `${d.hoy.slice(0, 4)}-${String(Number(d.hoy.slice(5, 7)) - 1 || 12).padStart(2, "0")}`,
  );
  const totalCuentas = Object.values(d.porEstado).reduce((s, n) => s + n, 0);
  const cambioIa =
    d.cifras.iaMesPasadoUsd > 0
      ? `${d.cifras.iaMesUsd >= d.cifras.iaMesPasadoUsd ? "+" : "−"}${porciento(
          Math.abs(d.cifras.iaMesUsd / d.cifras.iaMesPasadoUsd - 1),
        )} frente a ${mesPasado}`
      : `sin medición en ${mesPasado}`;
  const meses = d.iaPorMes.map((m) => ({
    nombre: nombreMes(m.mes).slice(0, 3),
    facturado: m.facturado,
    ia: Math.round(m.usd * tasa),
  }));
  const iaPesos = d.cifras.iaMesUsd * tasa;
  const ingreso = d.cifras.ingresoMensual;
  const margen = ingreso === null ? null : ingreso - iaPesos;
  const parteIa = d.cifras.facturadoMes > 0 ? iaPesos / d.cifras.facturadoMes : null;

  return (
    <>
      <Encabezado titulo="Inicio" subtitulo={diaLargo(d.revisadoEn)} acciones={<BotonBuscar />} />

      {/* ── Para atender hoy ── */}
      <Tarjeta
        titulo="Para atender hoy"
        accion={
          <span className="text-[13px] text-muted-foreground">
            {pendientes.length > 0 && `${plural(pendientes.length, "pendiente")}, `}
            revisado a las {hora(d.revisadoEn)}
          </span>
        }
        className="gap-1"
      >
        {pendientes.length === 0 ? (
          <div className="flex items-center gap-3.5 py-3">
            <span className="size-2 shrink-0 rounded-full bg-success" aria-hidden />
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">Nada pendiente. Todo al día.</span>
              <span className="text-[13px] text-muted-foreground">
                Sin morosos, sin cupos al límite y sin fallas de lectura.
              </span>
            </div>
          </div>
        ) : (
          <ul className="m-0 list-none p-0">
            {pendientes.map((p, i) => (
              <li
                key={p.clave}
                className={cn(
                  "flex flex-wrap items-center gap-x-3.5 gap-y-2 py-3 sm:flex-nowrap",
                  i > 0 && "border-t border-border",
                )}
              >
                <span className={cn("size-2 shrink-0 rounded-full", PUNTO[p.tono])} aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-medium">{p.titulo}</span>
                  <span className="text-[13px] text-muted-foreground">{p.detalle}</span>
                </div>
                <Link
                  href={p.accion.href}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ml-5 sm:ml-0")}
                >
                  {p.accion.texto}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      {/* ── Cifras del mes ── */}
      <section
        aria-label="Cifras del mes"
        className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-3 xl:grid-cols-6 [&>*]:bg-card"
      >
        <Cifra
          etiqueta="Ingreso mensual recurrente"
          valor={ingreso === null ? <SinConfigurar /> : pesos(ingreso)}
          nota={
            ingreso === null
              ? "Los planes no tienen precio"
              : d.cifras.porCobrar > 0
                ? `${pesos(d.cifras.porCobrar)} vencido sin cobrar`
                : `Facturado en ${mesPasado}: ${pesos(d.cifras.facturadoMesPasado)}`
          }
        />
        <Cifra
          etiqueta="Cuentas activas"
          valor={entero(d.cifras.activas)}
          nota={`${d.cifras.nuevas - d.cifras.seFueron >= 0 ? "+" : "−"}${Math.abs(
            d.cifras.nuevas - d.cifras.seFueron,
          )} este mes`}
        />
        <Cifra
          etiqueta="Cuentas nuevas"
          valor={entero(d.cifras.nuevas)}
          nota={`En ${mesPasado}: ${d.cifras.nuevasMesPasado}`}
        />
        <Cifra
          etiqueta="Cuentas que se fueron"
          valor={entero(d.cifras.seFueron)}
          nota={`En ${mesPasado}: ${d.cifras.seFueronMesPasado}`}
        />
        <Cifra
          etiqueta="Gasto de IA del mes"
          valor={dolares(d.cifras.iaMesUsd)}
          nota={`${pesos(d.cifras.iaMesUsd * tasa)}, ${cambioIa}`}
        />
        <Cifra
          etiqueta="Margen"
          valor={margen === null ? <SinConfigurar /> : pesos(margen)}
          nota={
            margen === null || !ingreso
              ? "Necesita el precio de los planes"
              : `${porciento(margen / ingreso, 1)} de lo que se cobra`
          }
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Tarjeta
          titulo="Ingreso contra gasto de IA"
          accion={
            <span className="flex gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-chart-2" aria-hidden />
                Ingreso
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-chart-1" aria-hidden />
                Gasto de IA
              </span>
            </span>
          }
        >
          <ChartContainer config={configIa} className="h-56 w-full">
            <BarChart data={meses} margin={{ left: 4, right: 4 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="nombre" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(v: number) =>
                  v >= 1_000_000
                    ? `${(v / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M`
                    : `${Math.round(v / 1000)} mil`
                }
              />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => pesos(Number(v))} />} />
              <Bar dataKey="facturado" fill="var(--color-facturado)" radius={4} />
              <Bar dataKey="ia" fill="var(--color-ia)" radius={4} />
            </BarChart>
          </ChartContainer>
          <span className="text-[13px] text-muted-foreground">
            {parteIa !== null && `Este mes la IA cuesta ${porciento(parteIa, 1)} de lo facturado. `}
            {d.medicionDesde
              ? `La IA se mide desde el ${fecha(`${d.medicionDesde}T12:00:00Z`)}; el ingreso es lo facturado cada mes.`
              : "Todavía no hay consumo medido."}
          </span>
        </Tarjeta>

        <Tarjeta titulo="Cuentas por estado y por plan">
          {totalCuentas > 0 && (
            <div
              role="img"
              aria-label={`${totalCuentas} cuentas: ${ORDEN_ESTADOS.map(
                (e) => `${d.porEstado[e.clave]} ${e.texto.toLowerCase()}`,
              ).join(", ")}`}
              className="flex h-2.5 gap-0.5 overflow-hidden rounded-[5px]"
            >
              {ORDEN_ESTADOS.map((e) =>
                d.porEstado[e.clave] > 0 ? (
                  <span
                    key={e.clave}
                    className={e.color}
                    style={{ width: `${(d.porEstado[e.clave] / totalCuentas) * 100}%` }}
                  />
                ) : null,
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {ORDEN_ESTADOS.map((e) => (
              <div key={e.clave} className="flex items-center gap-2 text-[13px]">
                <span className={cn("size-2.5 shrink-0 rounded-sm", e.color)} aria-hidden />
                <span className="flex-1">{e.texto}</span>
                <Mono className="text-[13px]">{d.porEstado[e.clave]}</Mono>
              </div>
            ))}
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <Th>Plan</Th>
                <Th derecha>Cuentas</Th>
                <Th derecha>Ingreso del mes</Th>
              </tr>
            </thead>
            <tbody>
              {d.porPlan.map((p) => (
                <tr key={p.clave} className="group/fila">
                  <Td>{p.nombre}</Td>
                  <Td derecha>
                    <Mono>{p.cuentas}</Mono>
                  </Td>
                  <Td derecha>
                    {p.precioMensual === null ? (
                      <SinConfigurar texto="—" />
                    ) : (
                      <Mono>{pesos(p.facturadoMes)}</Mono>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Tarjeta>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2.2fr_1fr]">
        <Tarjeta
          titulo="Las 5 empresas que más gastan en IA este mes"
          accion={
            <Link
              href="/plataforma/consumo-ia"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Ver consumo de IA
            </Link>
          }
        >
          {d.topIa.length === 0 ? (
            <p className="m-0 py-6 text-center text-sm text-muted-foreground">
              Ninguna empresa usó la IA este mes.
            </p>
          ) : (
            <div className="-mx-3 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr>
                    <Th>Empresa</Th>
                    <Th derecha>Gasto de IA</Th>
                    <Th derecha>Paga su cuenta</Th>
                    <Th derecha>IA frente a lo que paga</Th>
                  </tr>
                </thead>
                <tbody>
                  {d.topIa.map((e) => (
                    <tr key={e.empresaId} className="group/fila">
                      <Td>
                        <Link
                          href={`/plataforma/cuentas/${e.cuentaId}`}
                          className="font-medium hover:underline"
                        >
                          {e.empresa}
                        </Link>
                        <span className="block text-xs text-muted-foreground">
                          Cuenta {e.cuenta}
                          {e.planNombre && `, ${e.planNombre}`}
                        </span>
                      </Td>
                      <Td derecha>
                        <Mono className="block">{dolares(e.costoUsd)}</Mono>
                        <Mono className="block text-xs text-muted-foreground">
                          {pesos(e.costoUsd * tasa)}
                        </Mono>
                      </Td>
                      <Td derecha>
                        {e.pagaMensual === null ? (
                          <SinConfigurar texto="—" />
                        ) : (
                          <Mono>{pesos(e.pagaMensual)}</Mono>
                        )}
                      </Td>
                      <Td derecha>
                        {e.pagaMensual ? (
                          <span className="inline-flex items-center gap-2">
                            {e.costoUsd * tasa > e.pagaMensual && (
                              <Pastilla tono="peligro">Cuesta más de lo que paga</Pastilla>
                            )}
                            <Mono>{porciento((e.costoUsd * tasa) / e.pagaMensual)}</Mono>
                          </span>
                        ) : (
                          <SinConfigurar texto="—" />
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>

        <Tarjeta titulo="Actividad" className="gap-0">
          {[
            {
              etiqueta: "Usuarios que entraron hoy",
              valor: entero(d.actividad.hoy),
              nota: `Ayer: ${entero(d.actividad.ayer)}`,
            },
            {
              etiqueta: "Usuarios que entraron esta semana",
              valor: entero(d.actividad.semana),
              nota: `De ${plural(d.actividad.usuariosActivos, "usuario activo", "usuarios activos")}`,
            },
            {
              etiqueta: "Empresas activas",
              valor: `${entero(d.actividad.empresasActivas)} de ${entero(d.actividad.empresas)}`,
              nota: "Con alguien que entró en los últimos 7 días",
            },
          ].map((c, i) => (
            <div
              key={c.etiqueta}
              className={cn("flex flex-col gap-1 py-3", i > 0 && "border-t border-border")}
            >
              <span className="text-xs text-muted-foreground">{c.etiqueta}</span>
              <Mono className="text-lg font-medium">{c.valor}</Mono>
              <span className="text-xs text-muted-foreground">{c.nota}</span>
            </div>
          ))}
          {d.accesosDesde && (
            <p className="m-0 border-t border-border pt-3 text-xs text-muted-foreground">
              Los accesos se cuentan desde el {fecha(`${d.accesosDesde}T12:00:00Z`)}.
            </p>
          )}
        </Tarjeta>
      </div>
    </>
  );
}
