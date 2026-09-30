import { Suspense } from "react";

import { PlanCuentasView } from "@/modules/plan-cuentas/views/PlanCuentasView";

/** Lee el filtro con `useSearchParams` (`?q=…&inactivas=1`): va dentro de un `Suspense`. */
export default function PlanCuentasPage() {
  return (
    <Suspense>
      <PlanCuentasView />
    </Suspense>
  );
}
