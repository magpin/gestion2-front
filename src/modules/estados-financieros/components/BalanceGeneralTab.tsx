"use client";

import { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Aviso } from "@/components/shared/Aviso";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorCarga, SILENCIOSO } from "@/components/shared/ErrorCarga";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { formatCOP } from "@/lib/utils";
import { fechaCorta, indicadoresBalance, valoresBalance } from "../lib/estados";
import { estadosApi } from "../services/estados.service";
import type { Balance, BalanceGeneral, LadoBalance } from "../types/estados.types";
import { Dato, Fila, TablaEstado, Tarjeta } from "./Comun";

/** El balance general al corte del mes: lo que la empresa tiene, lo que debe y lo que es suyo. */
export function BalanceGeneralTab({ mes, comparar }: { mes: string; comparar?: string }) {
  const { data, isError, error, refetch } = useQuery({
    queryKey: ["estados-financieros", "balance", mes, comparar ?? ""],
    queryFn: () => estadosApi.balance(mes, comparar),
    meta: SILENCIOSO,
  });

  if (data === undefined) {
    return isError ? <ErrorCarga error={error} titulo="No se pudo armar el estado" onReintentar={refetch} /> : <SkeletonTable />;
  }

  const b = data.actual;
  const vacio = b.activo.secciones.length + b.pasivo.secciones.length + b.patrimonio.secciones.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {b.diferencia !== 0 && (
        <Aviso tono="alarma" titulo="El libro no cuadra al corte" cifra={formatCOP(b.diferencia)}>
          El activo no es igual al pasivo más el patrimonio. Suele ser un asiento a medio registrar o un saldo inicial
          sin su contrapartida: revísalo en el Libro con el balance de prueba.
        </Aviso>
      )}
      {!vacio && (
        <ul className="grid gap-4 md:grid-cols-3">
          {[
            { rotulo: "Lo que tenés · activo", valor: b.activo.total },
            { rotulo: "Lo que debés · pasivo", valor: b.pasivo.total },
            { rotulo: "Lo que es de los socios · patrimonio", valor: b.patrimonio.total },
          ].map((t) => (
            <li key={t.rotulo} className="rounded-3xl border border-border bg-card px-5 py-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{t.rotulo}</p>
              <p className="mt-1 font-mono text-2xl font-semibold tracking-[-0.03em] whitespace-nowrap tabular-nums">{formatCOP(t.valor)}</p>
            </li>
          ))}
        </ul>
      )}
      {vacio ? (
        <EmptyState
          titulo="Sin saldos al corte"
          descripcion="Cuando se registren los saldos iniciales o los primeros movimientos, el balance sale solo del libro."
        />
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <Tabla datos={data} />
          <aside className="flex w-full flex-col gap-4 lg:w-72 lg:shrink-0">
            <Ecuacion balance={b} />
            <Indicadores balance={b} />
          </aside>
        </div>
      )}
    </div>
  );
}

const LADOS: Array<{ clave: "activo" | "pasivo" | "patrimonio"; etiqueta: string }> = [
  { clave: "activo", etiqueta: "Activo" },
  { clave: "pasivo", etiqueta: "Pasivo" },
  { clave: "patrimonio", etiqueta: "Patrimonio" },
];

function Tabla({ datos }: { datos: Balance }) {
  const [abiertos, setAbiertos] = useState<Set<string>>(() => new Set());
  const comparando = datos.comparado !== null;
  const antes = valoresBalance(datos.comparado?.balance);
  const alternar = (grupo: string) =>
    setAbiertos((a) => {
      const b = new Set(a);
      if (b.has(grupo)) b.delete(grupo);
      else b.add(grupo);
      return b;
    });

  const columnas = comparando
    ? [`Al ${fechaCorta(datos.periodo.corte)}`, `Al ${fechaCorta(datos.comparado!.periodo.corte)}`, "Variación"]
    : [`Al ${fechaCorta(datos.periodo.corte)}`];

  const lado = (clave: (typeof LADOS)[number]["clave"], etiqueta: string, l: LadoBalance) => (
    <Fragment key={clave}>
      <Fila tipo="seccion" etiqueta={etiqueta} comparando={comparando} />
      {l.secciones.length === 0 && <Fila tipo="detalle" etiqueta="Sin saldos" comparando={comparando} />}
      {l.secciones.map((s) => (
        <Fragment key={s.etiqueta}>
          <Fila tipo="grupo" etiqueta={<span className="font-semibold">{s.etiqueta}</span>} comparando={comparando} />
          {/* Con una sola sección, su total es el del lado: no se repite. */}
          {s.renglones.map((r) => {
            const tieneDetalle = r.cuentas.length > 0;
            const abierto = abiertos.has(r.grupo);
            return (
              <Fragment key={r.grupo}>
                <Fila
                  tipo="grupo"
                  etiqueta={r.etiqueta}
                  valor={r.valor}
                  anterior={antes.get(r.grupo)}
                  comparando={comparando}
                  abierta={tieneDetalle ? abierto : undefined}
                  onAlternar={tieneDetalle ? () => alternar(r.grupo) : undefined}
                />
                {abierto &&
                  r.cuentas.map((c) => (
                    <Fila
                      key={c.codigo}
                      tipo="detalle"
                      etiqueta={`${c.codigo} · ${c.nombre}`}
                      valor={c.valor}
                      anterior={antes.get(`cuenta:${c.codigo}`)}
                      comparando={comparando}
                    />
                  ))}
              </Fragment>
            );
          })}
          {l.secciones.length > 1 && (
            <Fila
              tipo="subtotal"
              etiqueta={`Total ${s.etiqueta.toLowerCase()}`}
              valor={s.total}
              anterior={antes.get(`seccion:${s.etiqueta}`)}
              comparando={comparando}
            />
          )}
        </Fragment>
      ))}
      <Fila
        tipo={clave === "activo" ? "total" : "subtotal"}
        etiqueta={`Total ${etiqueta.toLowerCase()}`}
        valor={l.total}
        anterior={antes.get(`total:${clave}`)}
        comparando={comparando}
      />
    </Fragment>
  );

  return (
    <TablaEstado titulo="Balance general" subtitulo={`Saldos del libro al ${fechaCorta(datos.periodo.corte)}`} columnas={columnas}>
      {LADOS.map(({ clave, etiqueta }) => lado(clave, etiqueta, datos.actual[clave]))}
      <Fila
        tipo="total"
        etiqueta="Pasivo más patrimonio"
        valor={datos.actual.pasivo.total + datos.actual.patrimonio.total}
        anterior={antes.get("total:pasivoPatrimonio")}
        comparando={comparando}
      />
    </TablaEstado>
  );
}

/** Activo = pasivo + patrimonio, dicho en plata. */
function Ecuacion({ balance }: { balance: BalanceGeneral }) {
  return (
    <Tarjeta titulo="La ecuación" subtitulo="Lo que tiene = lo que debe + lo que es suyo">
      <Dato etiqueta="Activo" valor={formatCOP(balance.activo.total)} />
      <Dato etiqueta="Pasivo" valor={formatCOP(balance.pasivo.total)} />
      <Dato etiqueta="Patrimonio" valor={formatCOP(balance.patrimonio.total)} />
      <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
        {balance.diferencia === 0 ? "Cuadra: el libro está completo al corte." : `No cuadra por ${formatCOP(balance.diferencia)}.`}
      </p>
    </Tarjeta>
  );
}

function Indicadores({ balance }: { balance: BalanceGeneral }) {
  const { capitalDeTrabajo, razonCorriente: razon, endeudamiento } = indicadoresBalance(balance);
  return (
    <Tarjeta titulo="Indicadores">
      <Dato etiqueta="Capital de trabajo" valor={formatCOP(capitalDeTrabajo)} />
      <Dato
        etiqueta="Razón corriente"
        valor={razon === null ? "—" : razon.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
      />
      <Dato
        etiqueta="Endeudamiento"
        valor={endeudamiento === null ? "—" : `${endeudamiento.toLocaleString("es-CO", { maximumFractionDigits: 1 })} %`}
      />
      <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
        {razon === null
          ? "No hay deudas de corto plazo al corte."
          : `Por cada peso que debe a corto plazo, tiene $ ${razon.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} para pagarlo.`}
        {" "}
        {capitalDeTrabajo >= 0
          ? "El capital de trabajo es lo que le queda si pagara hoy todo lo de corto plazo."
          : "El capital de trabajo es negativo: lo de corto plazo no alcanza para las deudas de corto plazo."}
      </p>
    </Tarjeta>
  );
}
