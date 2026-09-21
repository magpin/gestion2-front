import { Suspense } from "react";

import { VisorView } from "@/modules/reportes/views/VisorView";

/**
 * El visor lee la elección de la URL con `useSearchParams`, y en una página
 * estática eso tiene que ir dentro de un `Suspense`: sin él, `next build`
 * falla.
 */
export default function VisorReportePage() {
  return (
    <Suspense>
      <VisorView />
    </Suspense>
  );
}
