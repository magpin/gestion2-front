import { api } from "@/core/api/api";

/** El nombre que manda el servidor en `Content-Disposition`, o el de por defecto. */
function nombreDeArchivo(disposicion: string | undefined, porDefecto: string): string {
  const m = disposicion?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return m ? decodeURIComponent(m[1]) : porDefecto;
}

/**
 * Baja un PDF del backend al disco con el nombre que decide el servidor. Con
 * axios, para que viaje la sesión; el enlace temporal se revoca después.
 */
export async function descargarPdf(ruta: string, porDefecto: string): Promise<void> {
  const r = await api.get<Blob>(ruta, { responseType: "blob" });
  const nombre = nombreDeArchivo(r.headers["content-disposition"] as string | undefined, porDefecto);
  const url = URL.createObjectURL(r.data);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // Un momento después: revocarla en el mismo tick cancela la descarga en
  // algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
