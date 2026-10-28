"use client";

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { useAuthStore } from "@/core/store/authStore";
import type { RolCodigo } from "@/modules/auth/types/auth.types";
import { Maria } from "./Maria";
import { ROLES_MARIA } from "../hooks/usePendientes";
import { MARIA_PROXIMAMENTE } from "../proximamente";

/**
 * Un estado vacío con María invitando a empezar, en vez de un ícono genérico
 * (lámina `Fuera` de `mocks/maria-identidad/`). La cara va a 56 px, con sus ondas.
 *
 * **Solo para quien la ve.** A quien no tiene a María en la barra, ofrecérsela
 * acá sería una puerta que da 403: para esa persona sale el vacío de siempre,
 * con el texto que la sección ya tenía.
 */
export function VacioConMaria({
  titulo,
  invitacion,
  sinMaria,
  roles: quienes = ROLES_MARIA,
}: {
  titulo: string;
  /** Lo que dice ella, en primera persona y con voseo. */
  invitacion: string;
  /** El texto de la sección para quien no ve a María. */
  sinMaria: string;
  /**
   * Quién puede hacer lo que ella ofrece, si son menos que los que la ven:
   * facturar un pedido leído no lo puede un contador.
   */
  roles?: RolCodigo[];
}) {
  const roles = useAuthStore((s) => s.roles);
  const veMaria =
    !MARIA_PROXIMAMENTE && ROLES_MARIA.some((r) => roles.includes(r) && quienes.includes(r));

  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card px-6 py-20 text-center">
      {veMaria && <Maria estado="reposo" tamano={56} />}
      <p className="text-lg font-semibold">
        {titulo}
        <span className="text-brand">.</span>
      </p>
      <p className="max-w-md text-sm leading-6 text-muted-foreground">
        {veMaria ? invitacion : sinMaria}
      </p>
      {veMaria && (
        <Link href="/dashboard/asistente" className={buttonVariants()}>
          Subir documentos
        </Link>
      )}
    </div>
  );
}
