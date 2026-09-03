import * as React from "react"

const MOBILE_BREAKPOINT = 768

// Reason: useSyncExternalStore evita setState dentro de useEffect (regla
// react-hooks/set-state-in-effect) y resuelve la hidratación SSR vía el snapshot de servidor.
function subscribe(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
