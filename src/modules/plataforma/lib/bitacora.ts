import { pesos } from "./formato";
import {
  MEDIOS_PAGO,
  NOMBRE_ACCION,
  NOMBRE_ESTADO,
  NOMBRE_PLAN,
  type EntradaBitacora,
  type EstadoCuenta,
  type Plan,
} from "../types/plataforma.types";

const plan = (v: unknown) => NOMBRE_PLAN[v as Plan] ?? String(v ?? "");
const estado = (v: unknown) =>
  NOMBRE_ESTADO[v as EstadoCuenta] ?? String(v ?? "");
const texto = (v: unknown) => (typeof v === "string" ? v : "");

interface Cupos {
  maxEmpresas?: number;
  maxUsuarios?: number;
  plan?: string;
}

/**
 * Una entrada de la bitácora en palabras: «Cambió el plan de Profesional a
 * Empresarial», no `{"plan":"EMPRESARIAL"}`.
 *
 * Las entradas de antes de la 0055 guardaban el pedido tal cual, sin antes ni
 * después: se describen con lo que tengan.
 */
export function describir(e: EntradaBitacora): string {
  const d = e.detalle ?? {};
  const antes = d.antes as Cupos | string | undefined;
  const despues = d.despues as Cupos | string | undefined;

  switch (e.accion) {
    case "CREAR_CUENTA":
      return `Creó la cuenta${d.email ? ` con el administrador ${texto(d.email)}` : ""}`;
    case "CREAR_EMPRESA":
      return `Creó la empresa ${texto(d.razonSocial)}${d.nit ? `, NIT ${texto(d.nit)}` : ""}`;
    case "CREAR_USUARIO":
      return `Agregó el usuario ${texto(d.email)}`;
    case "RESTABLECER_PASSWORD":
      return `Restableció la contraseña de ${texto(d.email)}`;
    case "DESACTIVAR_USUARIO":
      return `Desactivó a ${texto(d.email)}`;
    case "REACTIVAR_USUARIO":
      return `Reactivó a ${texto(d.email)}`;
    case "RENOMBRAR_CUENTA":
      return `Cambió el nombre de «${texto(antes)}» a «${texto(despues)}»`;
    case "CAMBIAR_ESTADO": {
      if (typeof despues === "string") {
        const motivo = d.motivo ? `. Motivo: ${texto(d.motivo)}` : "";
        const quien = d.origen === "SISTEMA" ? " automáticamente" : "";
        return `Pasó${quien} de ${estado(antes).toLowerCase()} a ${estado(despues).toLowerCase()}${motivo}`;
      }
      return d.estado
        ? `Pasó a ${estado(d.estado).toLowerCase()}`
        : NOMBRE_ACCION[e.accion];
    }
    case "CAMBIAR_PLAN": {
      if (
        antes &&
        despues &&
        typeof antes === "object" &&
        typeof despues === "object"
      ) {
        return `Cambió el plan de ${plan(antes.plan)} a ${plan(despues.plan)}`;
      }
      return d.plan
        ? `Cambió el plan a ${plan(d.plan)}`
        : "Cambió el plan o los cupos";
    }
    case "AJUSTAR_CUPOS": {
      if (
        antes &&
        despues &&
        typeof antes === "object" &&
        typeof despues === "object"
      ) {
        const partes: string[] = [];
        if (antes.maxEmpresas !== despues.maxEmpresas)
          partes.push(
            `empresas de ${antes.maxEmpresas} a ${despues.maxEmpresas}`,
          );
        if (antes.maxUsuarios !== despues.maxUsuarios)
          partes.push(
            `usuarios de ${antes.maxUsuarios} a ${despues.maxUsuarios}`,
          );
        return partes.length > 0
          ? `Ajustó los cupos: ${partes.join(", ")}`
          : "Ajustó los cupos";
      }
      return "Ajustó los cupos";
    }
    case "EDITAR_PLAN": {
      const a = antes as Cupos | undefined;
      const b = despues as
        | (Cupos & { precioMensual?: number | null; topeIaUsd?: number | null })
        | undefined;
      if (b && "precioMensual" in b) {
        return `Editó el plan ${plan(d.plan)}: ${
          b.precioMensual === null || b.precioMensual === undefined
            ? "sin precio"
            : `${pesos(b.precioMensual)} al mes`
        }${b.topeIaUsd !== null && b.topeIaUsd !== undefined ? `, tope de IA de US$ ${b.topeIaUsd}` : ""}`;
      }
      return `Editó el plan ${plan(d.plan)}${
        a && b
          ? `: ${b.maxEmpresas} empresas y ${b.maxUsuarios} usuarios para cuentas nuevas`
          : ""
      }`;
    }
    case "REGISTRAR_PAGO":
      return `Registró un pago de ${pesos(Number(d.monto))}${
        d.medio
          ? ` por ${(MEDIOS_PAGO[texto(d.medio)] ?? texto(d.medio)).toLowerCase()}`
          : ""
      }`;
    case "CAMBIAR_SUSCRIPCION": {
      const a = antes as
        { precioPactado?: number | null; diaCorte?: number } | undefined;
      const b = despues as
        { precioPactado?: number | null; diaCorte?: number } | undefined;
      const partes: string[] = [];
      if (a && b && a.precioPactado !== b.precioPactado)
        partes.push(
          b.precioPactado === null || b.precioPactado === undefined
            ? "volvió al precio del plan"
            : `precio pactado de ${pesos(b.precioPactado)}`,
        );
      if (a && b && a.diaCorte !== b.diaCorte)
        partes.push(`corte el día ${b.diaCorte}`);
      return partes.length > 0
        ? `Suscripción: ${partes.join(", ")}`
        : "Cambió la suscripción";
    }
    case "PAUSAR_IA":
      return `Pausó la IA${d.alcance === "PLATAFORMA" ? " para todas las cuentas" : ""}. ${texto(d.motivo)}`;
    case "REANUDAR_IA":
      return `Reanudó la IA${d.alcance === "PLATAFORMA" ? " para todas las cuentas" : ""}`;
    case "PUBLICAR_ANUNCIO":
      return `Publicó el anuncio «${texto(d.titulo)}»`;
    case "RETIRAR_ANUNCIO":
      return `Retiró el anuncio «${texto(d.titulo)}»`;
    case "DESACTIVAR_ADMIN":
      return `Desactivó al administrador ${texto(d.email)}`;
    case "REACTIVAR_ADMIN":
      return `Reactivó al administrador ${texto(d.email)}`;
    case "RESTABLECER_ADMIN":
      return `Restableció la contraseña del administrador ${texto(d.email)}`;
    case "CARGAR_TARIFA_RETENCION":
      return `Cargó una vigencia de ${texto(d.concepto)}: ${String(d.tarifa ?? "")} % desde el ${texto(d.desde)} (${texto(d.norma)})`;
    case "CARGAR_UVT":
      return `Cargó la UVT del ${String(d.anio ?? "")}: ${String(d.valor ?? "")}`;
    case "CARGAR_AUTORRETENCION":
      return `Cargó la autorretención especial del CIIU ${texto(d.ciiu)}: ${String(d.tarifa ?? "")} % desde el ${texto(d.desde)} (${texto(d.norma)})`;
    case "CARGAR_PARAMETRO_ICA":
      return `Cargó la ley de ICA de ${texto(d.municipio)} para ${String(d.anio ?? "")} (${texto(d.acuerdo)})`;
    default:
      return NOMBRE_ACCION[e.accion] ?? e.accion;
  }
}
