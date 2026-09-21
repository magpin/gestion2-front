import { Suspense } from "react";

import { ArmadorView } from "@/modules/reportes/views/ArmadorView";

/** Lee de qué se parte con `useSearchParams`: va dentro de un `Suspense`. */
export default function ArmarReportePage() {
  return (
    <Suspense>
      <ArmadorView />
    </Suspense>
  );
}
