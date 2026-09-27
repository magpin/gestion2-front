import { notFound } from "next/navigation";

import { PasoEmpresa } from "@/modules/configuracion/pasos/PasoEmpresa";
import { PasoImpuestos } from "@/modules/configuracion/pasos/PasoImpuestos";
import { PasoPlanCuentas } from "@/modules/configuracion/pasos/PasoPlanCuentas";
import { PasoResoluciones } from "@/modules/configuracion/pasos/PasoResoluciones";
import { PasoSedes } from "@/modules/configuracion/pasos/PasoSedes";
import { PasoSituacionLegal } from "@/modules/configuracion/pasos/PasoSituacionLegal";

// Una ruta por paso y no un asistente con estado interno: el director entra
// directo a corregir la tarifa de ICA desde el tablero, sin recorrer los seis.
//
// Solo lo que hay que resolver antes de operar. Invitar usuarios y cargar
// clientes se hace desde su propia pantalla, cuantas veces haga falta: como paso
// del asistente quedaban como un pendiente que nunca se cierra.
const PASOS = {
  empresa: PasoEmpresa,
  sedes: PasoSedes,
  situacion_legal: PasoSituacionLegal,
  impuestos: PasoImpuestos,
  plan_cuentas: PasoPlanCuentas,
  resoluciones: PasoResoluciones,
} as const;

export function generateStaticParams() {
  return Object.keys(PASOS).map((paso) => ({ paso }));
}

export default async function PasoPage({ params }: { params: Promise<{ paso: string }> }) {
  const { paso } = await params;
  const Componente = PASOS[paso as keyof typeof PASOS];
  if (!Componente) notFound();
  return <Componente />;
}
