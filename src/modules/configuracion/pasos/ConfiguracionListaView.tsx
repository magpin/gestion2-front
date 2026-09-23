"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useEffect } from "react";

import { useAuthStore } from "@/core/store/authStore";
import { aviso } from "@/lib/avisos";
import { useEstadoConfiguracion } from "../hooks/useEstadoConfiguracion";
import { Recorrido } from "../components/Recorrido";
import { RUTA_PASO } from "../components/rutas";
import styles from "../asistente.module.css";

/**
 * El cierre del asistente. Terminada la configuración se entra al Inicio, con
 * un aviso que dice que quedó lista —el dueño lo pidió así el 23 de septiembre
 * de 2026: el cierre lleva a la plataforma, no a otra pantalla con un botón—.
 *
 * La pantalla de abajo queda solo como respaldo, mientras sale la redirección.
 * Si se llega sin haber terminado, manda al paso que falta.
 */
export function ConfiguracionListaView() {
  const router = useRouter();
  const { data, isLoading } = useEstadoConfiguracion();
  const empresas = useAuthStore((s) => s.empresas);
  const empresaId = useAuthStore((s) => s.empresaId);
  const empresa = empresas.find((e) => e.id === empresaId);

  // Llegar acá sin haber terminado es llegar por URL. El destino correcto es el
  // paso que falta, no una pantalla que felicita por algo que no pasó.
  const incompleta = data !== undefined && !data.completa;
  useEffect(() => {
    if (incompleta && data?.siguiente) router.replace(RUTA_PASO[data.siguiente]);
  }, [incompleta, data?.siguiente, router]);

  // Terminada, al Inicio: el dueño pidió que el cierre de la configuración lleve
  // a la plataforma, no a otra pantalla con un botón para ir.
  const completa = data?.completa === true;
  useEffect(() => {
    if (!completa) return;
    aviso.exito("Tu empresa quedó lista", "Los cinco pasos están completos.");
    router.replace("/dashboard");
  }, [completa, router]);

  if (isLoading || !data || incompleta) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  return (
    <main className="flex h-dvh items-center justify-center overflow-hidden bg-background p-3 sm:p-6 lg:p-8">
      <div
        className={`${styles.sombraTarjeta} mx-auto flex h-full max-h-[calc(100dvh-64px)] w-full max-w-[1240px] overflow-hidden rounded-[1.05rem] border border-border bg-card`}
      >
        <Recorrido
          pasos={data.pasos}
          actual={null}
          completados={data.completados}
          porcentaje={data.porcentaje}
          razonSocial={empresa?.razonSocial ?? "Tu empresa"}
        />

        <section className="flex min-w-0 grow flex-col items-center justify-center gap-7 overflow-y-auto px-6 py-10 text-center sm:px-12">
          <span
            className={`${styles.up} grid size-16 shrink-0 place-items-center rounded-full bg-success/15`}
          >
            <Check className="size-8 text-success" strokeWidth={2.5} />
          </span>

          <h1
            className={`${styles.up} ${styles.d1} m-0 max-w-[620px] font-serif text-[clamp(2.25rem,5vw,3.25rem)] leading-[1.05] tracking-[-1.2px]`}
          >
            Tu empresa está <span className="italic">lista para facturar.</span>
          </h1>

          <ul
            className={`${styles.up} ${styles.d2} m-0 flex w-full max-w-[520px] list-none flex-col p-0 text-left`}
          >
            {data.pasos.map((paso) => (
              <li
                key={paso.clave}
                className="flex items-start gap-3 border-b border-border py-3.5 last:border-b-0"
              >
                <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2.5} />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">{paso.nombre}</span>
                  <span className="text-xs text-muted-foreground">{paso.resumen}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className={`${styles.up} ${styles.d3} flex flex-wrap justify-center gap-3`}>
            <Link
              href="/dashboard"
              className="flex h-11 items-center gap-2.5 rounded-[0.6rem] bg-primary px-5 text-sm font-medium text-primary-foreground no-underline"
            >
              Ir al tablero
              <ArrowRight className="size-[15px]" />
            </Link>
            <Link
              href="/dashboard/ventas"
              className="flex h-11 items-center rounded-[0.6rem] border border-input bg-card px-5 text-sm font-medium text-foreground no-underline hover:bg-secondary"
            >
              Crear la primera factura
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
