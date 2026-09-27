"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  cop,
  miles,
  porcentaje,
  segundos,
  usd,
  type TableroConsumo,
} from "./consumo";

const configDiario = {
  chatUsd: { label: "Chat", color: "var(--chart-1)" },
  lecturaUsd: { label: "Lectura de documentos", color: "var(--chart-2)" },
} satisfies ChartConfig;

const configTokens = {
  valor: { label: "Tokens", color: "var(--chart-1)" },
} satisfies ChartConfig;

const TIPO_DOCUMENTO: Record<string, string> = {
  RUT: "RUT",
  CAMARA_COMERCIO: "Cámara de Comercio",
  RESOLUCION_DIAN: "Resolución DIAN",
  CONCEPTO_RETENCION: "Concepto de retención",
};

/**
 * El tablero, dibujado. Recibe los datos ya pedidos y la tasa de cambio: no
 * pide nada ni guarda nada, para poder probarlo con datos fijos.
 *
 * **Solo cifras.** No hay texto de conversaciones ni de documentos que
 * mostrar, porque la API no lo manda.
 */
export function TableroConsumoVista({
  datos,
  tasa,
}: {
  datos: TableroConsumo;
  tasa: number;
}) {
  const { totales, eficiencia, simulacion } = datos;
  const t = totales.tokens;
  const escrituraUsd = (t.cacheEscrito * 6.25) / 1e6;
  const tokens = [
    { tipo: "Entrada nueva", valor: t.entrada },
    { tipo: "Caché leído", valor: t.cacheLeido },
    { tipo: "Caché escrito", valor: t.cacheEscrito },
    { tipo: "Salida", valor: t.salida },
  ];

  return (
    <div className="flex flex-col gap-6">
      {datos.truncado && (
        <p
          role="alert"
          className="m-0 rounded-md bg-warning/10 px-4 py-2 text-sm text-warning"
        >
          El período tiene más de 100.000 registros y se cortó: las cifras están
          incompletas. Elegí un rango más corto.
        </p>
      )}

      {/* ── Totales ── */}
      <section
        aria-label="Totales"
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
      >
        <Cifra
          titulo="Costo del período"
          valor={usd(totales.costoUsd)}
          detalle={cop(totales.costoUsd, tasa)}
        />
        <Cifra
          titulo="Por respuesta del chat"
          valor={usd(totales.costoPorRespuesta)}
          detalle={`${miles(totales.respuestas)} respuestas`}
        />
        <Cifra
          titulo="Por empresa"
          valor={usd(totales.costoPorEmpresa)}
          detalle={`${miles(totales.empresas)} ${totales.empresas === 1 ? "empresa" : "empresas"} usaron la IA`}
        />
        <Cifra
          titulo="Documentos leídos"
          valor={miles(totales.documentos)}
          detalle={`${datos.lectura.reduce((s, l) => s + l.fallidas, 0)} fallidos`}
        />
      </section>

      {/* ── Por día ── */}
      <Card>
        <CardHeader>
          <CardTitle>Costo por día</CardTitle>
          <CardDescription>
            {datos.desde} a {datos.hasta}, en US$
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={configDiario} className="h-64 w-full">
            <LineChart data={datos.porDia} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="dia"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={(v: number) => v.toFixed(2)}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                dataKey="chatUsd"
                type="monotone"
                stroke="var(--color-chatUsd)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="lecturaUsd"
                type="monotone"
                stroke="var(--color-lecturaUsd)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Tokens ── */}
        <Card>
          <CardHeader>
            <CardTitle>Dónde se van los tokens</CardTitle>
            <CardDescription>
              La escritura del caché cuesta 1,25 veces la entrada: en este
              período fueron {usd(escrituraUsd)} de {usd(totales.costoUsd)} (a
              tarifa de Opus).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={configTokens} className="h-56 w-full">
              <BarChart data={tokens} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="tipo"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tickFormatter={(v: number) => miles(v)}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="valor" fill="var(--color-valor)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* ── Eficiencia ── */}
        <Card>
          <CardHeader>
            <CardTitle>Eficiencia del chat</CardTitle>
            <CardDescription>
              Lo que dice si los tokens se están aprovechando.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Dato
                nombre="Aprovechamiento del caché"
                valor={porcentaje(eficiencia.aprovechamientoCache)}
              />
              <Dato
                nombre="Caché escrito por respuesta"
                valor={
                  eficiencia.cacheEscritoPorRespuesta === null
                    ? "—"
                    : `${miles(eficiencia.cacheEscritoPorRespuesta)} tokens`
                }
              />
              <Dato
                nombre="Consultas por respuesta"
                valor={
                  eficiencia.consultasPorRespuesta === null
                    ? "—"
                    : eficiencia.consultasPorRespuesta
                        .toFixed(1)
                        .replace(".", ",")
                }
              />
              <Dato
                nombre="Vueltas por respuesta"
                valor={
                  eficiencia.vueltasPorRespuesta === null
                    ? "—"
                    : eficiencia.vueltasPorRespuesta
                        .toFixed(1)
                        .replace(".", ",")
                }
              />
              <Dato
                nombre="Tiempo, mediana"
                valor={segundos(eficiencia.duracionMediana)}
              />
              <Dato
                nombre="Tiempo, percentil 95"
                valor={segundos(eficiencia.duracionP95)}
              />
            </dl>
            {eficiencia.sinDuracion > 0 && (
              <p className="m-0 mt-3 text-xs text-muted-foreground">
                {miles(eficiencia.sinDuracion)} respuestas son de antes de que
                se midiera el tiempo y las vueltas: no entran en esas cifras.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Simulación ── */}
      <Card>
        <CardHeader>
          <CardTitle>El mismo período en otros modelos</CardTitle>
          <CardDescription>
            Los mismos tokens con la tarifa de cada modelo. Es una simulación:
            dice cuánto se ahorraría, no si la calidad alcanza. Eso lo deciden
            las pruebas.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3">
          <Cifra
            titulo="Opus 5"
            valor={usd(simulacion.opus)}
            detalle={cop(simulacion.opus, tasa)}
          />
          <Cifra
            titulo="Sonnet 5"
            valor={usd(simulacion.sonnet)}
            detalle={ahorro(simulacion.sonnet, simulacion.opus)}
          />
          <Cifra
            titulo="Haiku 4.5"
            valor={usd(simulacion.haiku)}
            detalle={ahorro(simulacion.haiku, simulacion.opus)}
          />
        </CardContent>
      </Card>

      {/* ── Por empresa ── */}
      <Card>
        <CardHeader>
          <CardTitle>Por empresa</CardTitle>
          <CardDescription>La más cara primero.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2 font-medium">Empresa</th>
                <th className="py-2 text-right font-medium">Respuestas</th>
                <th className="py-2 text-right font-medium">Documentos</th>
                <th className="py-2 text-right font-medium">Tokens</th>
                <th className="py-2 text-right font-medium">Caché</th>
                <th className="py-2 text-right font-medium">Por respuesta</th>
                <th className="py-2 text-right font-medium">Costo</th>
              </tr>
            </thead>
            <tbody>
              {datos.porEmpresa.map((e) => (
                <tr key={e.empresaId} className="border-t border-muted">
                  <td className="py-2">{e.empresa}</td>
                  <td className="py-2 text-right tabular-nums">
                    {miles(e.respuestas)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {miles(e.documentos)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {miles(e.tokens)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {porcentaje(e.aprovechamientoCache)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {usd(e.costoPorRespuesta)}
                  </td>
                  <td className="py-2 text-right tabular-nums font-medium">
                    {usd(e.costoUsd)}
                  </td>
                </tr>
              ))}
              {datos.porEmpresa.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-4 text-center text-muted-foreground"
                  >
                    Nadie usó la IA en este período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Modelos ── */}
        <Card>
          <CardHeader>
            <CardTitle>Por modelo</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <tbody>
                {datos.porModelo.map((m) => (
                  <tr
                    key={m.modelo}
                    className="border-t border-muted first:border-t-0"
                  >
                    <td className="py-2 font-mono text-xs">{m.modelo}</td>
                    <td className="py-2 text-right tabular-nums">
                      {miles(m.llamadas)} llamadas
                    </td>
                    <td className="py-2 text-right tabular-nums font-medium">
                      {usd(m.costoUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* ── Lectura ── */}
        <Card>
          <CardHeader>
            <CardTitle>Lectura de documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Tipo</th>
                  <th className="py-2 text-right font-medium">Leídos</th>
                  <th className="py-2 text-right font-medium">Fallidos</th>
                  <th className="py-2 text-right font-medium">Promedio</th>
                  <th className="py-2 text-right font-medium">Tiempo</th>
                </tr>
              </thead>
              <tbody>
                {datos.lectura.map((l) => (
                  <tr key={l.tipo} className="border-t border-muted">
                    <td className="py-2">{TIPO_DOCUMENTO[l.tipo] ?? l.tipo}</td>
                    <td className="py-2 text-right tabular-nums">
                      {miles(l.cantidad)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {miles(l.fallidas)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {usd(l.costoPromedio)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {segundos(l.duracionPromedio)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {datos.lectura.some((l) => l.medidas < l.cantidad) && (
              <p className="m-0 mt-3 text-xs text-muted-foreground">
                Hay lecturas de antes de que se midiera su consumo: cuentan como
                leídas, pero no tienen costo ni tiempo.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Las más caras ── */}
      <Card>
        <CardHeader>
          <CardTitle>Las respuestas más caras</CardTitle>
          <CardDescription>
            Para encontrar el patrón que encarece. Sin texto: solo cifras.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-2 font-medium">Fecha</th>
                <th className="py-2 font-medium">Empresa</th>
                <th className="py-2 font-medium">Estado</th>
                <th className="py-2 text-right font-medium">Consultas</th>
                <th className="py-2 text-right font-medium">Tokens</th>
                <th className="py-2 text-right font-medium">Tiempo</th>
                <th className="py-2 text-right font-medium">Costo</th>
              </tr>
            </thead>
            <tbody>
              {datos.masCaras.map((r, i) => (
                <tr key={i} className="border-t border-muted">
                  <td className="py-2 tabular-nums">
                    {r.fecha.slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="py-2">{r.empresa}</td>
                  <td className="py-2 text-xs">{r.estado}</td>
                  <td className="py-2 text-right tabular-nums">
                    {r.consultas}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {miles(r.tokens)}
                  </td>
                  <td className="py-2 text-right tabular-nums">
                    {segundos(r.duracionMs)}
                  </td>
                  <td className="py-2 text-right tabular-nums font-medium">
                    {usd(r.costoUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Cifra({
  titulo,
  valor,
  detalle,
}: {
  titulo: string;
  valor: string;
  detalle?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card px-4 py-3">
      <span className="text-xs text-muted-foreground">{titulo}</span>
      <span className="text-lg font-semibold tabular-nums">{valor}</span>
      {detalle !== undefined && (
        <span className="text-xs text-muted-foreground">{detalle}</span>
      )}
    </div>
  );
}

function Dato({ nombre, valor }: { nombre: string; valor: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{nombre}</dt>
      <dd className="m-0 font-medium tabular-nums">{valor}</dd>
    </div>
  );
}

/** «−60 % frente a Opus». */
function ahorro(valor: number, base: number): string {
  if (base === 0) return "—";
  return `${Math.round(((valor - base) / base) * 100)} % frente a Opus`.replace(
    "-",
    "−",
  );
}
