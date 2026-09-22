import { Suspense } from "react";

import { CuentasView } from "@/modules/plataforma/views/CuentasView";

// El filtro, el orden y la página viven en la URL (`useSearchParams`).
export default function CuentasPage() {
  return (
    <Suspense>
      <CuentasView />
    </Suspense>
  );
}
