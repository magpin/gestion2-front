import { Suspense } from "react";

import { ConsumoView } from "@/modules/plataforma/views/ConsumoView";

export default function ConsumoPage() {
  return (
    <Suspense>
      <ConsumoView />
    </Suspense>
  );
}
