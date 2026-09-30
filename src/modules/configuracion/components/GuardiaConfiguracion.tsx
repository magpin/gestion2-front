"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Settings } from "lucide-react";

import { useAuthStore } from "@/core/store/authStore";
import { useEstadoConfiguracion } from "../hooks/useEstadoConfiguracion";
import { destinoAlEntrar, permitidaSinConfigurar, ROLES_CONFIGURACION } from "../lib/entrada";

/**
 * Mientras la configuración de la empresa no esté completa, el área de trabajo
 * no se usa: quien puede configurar va al paso que sigue (`destinoAlEntrar`),
 * y quien no puede ve por qué no puede operar y a quién pedírselo.
 *
 * Si el estado no responde, no se bloquea: el inicio ya muestra ese error, y
 * dejar a alguien sin sistema por una consulta caída es peor.
 */
export function GuardiaConfiguracion({ children }: { children: ReactNode }) {
  const router = useRouter();
  const ruta = usePathname();
  const roles = useAuthStore((s) => s.roles);
  const operando = useAuthStore((s) => s.operando);
  const { data } = useEstadoConfiguracion();

  const incompleta = operando && data !== undefined && data.siguiente !== null;
  const puedeConfigurar = ROLES_CONFIGURACION.some((r) => roles.includes(r));
  const libre = permitidaSinConfigurar(ruta);
  const redirigir = incompleta && puedeConfigurar && !libre;

  useEffect(() => {
    if (redirigir && data !== undefined) router.replace(destinoAlEntrar(data));
  }, [redirigir, data, router]);

  if (redirigir) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Llevándote a la configuración…
      </div>
    );
  }

  if (incompleta && !puedeConfigurar && !libre) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
        <Settings className="size-8 text-muted-foreground" />
        <h1 className="text-lg font-semibold">La empresa todavía se está configurando</h1>
        <p className="text-sm text-muted-foreground">
          Mientras falten datos —la resolución de la DIAN, el plan de cuentas, los impuestos— no se puede operar.
          Pedile al administrador o al contador que termine la configuración ({data?.porcentaje ?? 0} % lista).
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
