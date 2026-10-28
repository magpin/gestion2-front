import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Maria } from "../components/Maria";

/** Lo que se ve en vez de las pantallas de María mientras está cerrada. */
export function MariaProximamente() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card px-6 py-20 text-center">
      <Maria estado="reposo" tamano={56} />
      <p className="text-lg font-semibold">
        Próximamente
        <span className="text-brand">.</span>
      </p>
      <p className="max-w-md text-sm leading-6 text-muted-foreground">
        María estará disponible muy pronto. Mientras tanto, puede registrar sus
        documentos desde cada módulo.
      </p>
      <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
        Volver al inicio
      </Link>
    </div>
  );
}
