"use client";

import { create } from "zustand";

interface UiState {
  // Reason: proceso misional seleccionado en la barra por procesos. Determina qué
  // fila de transversales se muestra (fila 2). Es estado, no derivado de la ruta,
  // porque los transversales (Contabilidad, Caja, Terceros…) se comparten entre los
  // 3 básicos y la URL no dice desde cuál se llegó. Efímero por sesión (no se persiste).
  procesoActivo: string | null;
  setProcesoActivo: (id: string | null) => void;
}

// Ya no hay tema que guardar: el sistema es de tema claro y punto. Con eso se
// fue también el `persist`, porque el proceso activo es efímero por sesión y no
// había nada más que conservar entre recargas.
export const useUiStore = create<UiState>()((set) => ({
  procesoActivo: null,
  setProcesoActivo: (id) => set({ procesoActivo: id }),
}));
