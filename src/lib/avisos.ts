"use client";

import Swal from "sweetalert2";

import { temaActual } from "./tema";

/** El tema de sweetalert2, tomado de la pantalla que está detrás. */
const tema = (): "light" | "dark" => (temaActual() === "oscuro" ? "dark" : "light");

import { explicarError, type MomentoDelError } from "./errores";

// Avisos del sistema, en un solo lugar.
//
// Dos pesos distintos a propósito:
//   · éxito / info → discretos, arriba a la derecha, se van solos. Guardar algo
//     no debería costar un clic extra: son los avisos más frecuentes del sistema
//     y bloquear en cada uno haría que el usuario los cierre sin leerlos.
//   · error / advertencia → ventana central que exige "Entendido". Son los que
//     cambian lo que el usuario tiene que hacer a continuación, y pasan si no se
//     miran a tiempo.
//
// sweetalert2 inyecta su propio CSS desde el paquete (entrada sweetalert2.all.js),
// así que globals.css no se toca.

// Los avisos siguen el tema de la pantalla, no el del sistema operativo: con
// theme: "auto" un aviso saldría oscuro sobre una pantalla clara en quien puso
// el sistema en oscuro y el sistema en claro.

// buttonsStyling: false apaga los botones propios de sweetalert2 para que el
// botón use el mismo índigo que el resto del sistema.
const BOTON =
  "inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90";
const BOTON_SECUNDARIO =
  "mr-2 inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-accent";

// El mixin se crea en la primera llamada y no al importar: sweetalert2 necesita
// el DOM, y este módulo se evalúa también al renderizar en el servidor.
let discreto: ReturnType<typeof Swal.mixin> | null = null;

function toast() {
  discreto ??= Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
  });
  return discreto;
}

// ⚠️ sweetalert2 admite UN popup a la vez: al abrir el siguiente destruye el
// anterior, y el mixin discreto comparte ese estado global. Dos avisos seguidos
// no se apilan como hacía sonner — el segundo se come al primero. Por eso
// `exito` e `info` aceptan detalle: cuando una operación termina con más de una
// cosa que decir, se dicen todas en un solo aviso.
export const aviso = {
  exito(mensaje: string, detalle?: string): void {
    void toast().fire({
      icon: "success",
      title: mensaje,
      text: detalle,
      theme: tema(),
    });
  },

  info(mensaje: string, detalle?: string): void {
    void toast().fire({
      icon: "info",
      title: mensaje,
      text: detalle,
      theme: tema(),
    });
  },

  /**
   * Una operación que falló: qué pasó y qué hacer ahora, y no se va sola.
   *
   * Es la forma de avisar un error que vino del servidor. `error` a secas queda
   * para lo que se detecta en la pantalla antes de mandar nada. La explicación
   * —si se guardó algo, si conviene reintentar, a quién pedírselo— la arma
   * `explicarError` según cómo falló, en un solo lugar para toda la app.
   *
   * `titleText` y no `title`: el título es el mensaje del servidor, que puede
   * repetir algo que digitó una persona, y `title` lo interpretaría como HTML.
   */
  falla(error: unknown, momento: MomentoDelError = "guardar"): void {
    const explicado = explicarError(error, momento);
    if (explicado.silencioso) return;
    // Falta o está inactiva una cuenta del plan (el servidor manda cuál en
    // `cuentaCodigo`): se ofrece ir al plan ya filtrado en ella.
    const cuentaCodigo = (error as { response?: { data?: { cuentaCodigo?: string } } })?.response?.data
      ?.cuentaCodigo;
    if (typeof cuentaCodigo === "string" && cuentaCodigo !== "") {
      aviso.errorConSalida(explicado.titulo, {
        etiqueta: "Ir al plan de cuentas",
        ir: () => window.location.assign(`/dashboard/plan-cuentas?q=${encodeURIComponent(cuentaCodigo)}&inactivas=1`),
      });
      return;
    }
    void Swal.fire({
      icon: "error",
      titleText: explicado.titulo,
      text: explicado.queHacer,
      confirmButtonText: "Entendido",
      allowOutsideClick: false,
      theme: tema(),
      buttonsStyling: false,
      customClass: { confirmButton: BOTON },
    });
  },

  // `detalle` es para el "por qué" cuando el título solo alcanza para el "qué".
  error(mensaje: string, detalle?: string): void {
    void Swal.fire({
      icon: "error",
      title: mensaje,
      text: detalle,
      confirmButtonText: "Entendido",
      theme: tema(),
      buttonsStyling: false,
      customClass: { confirmButton: BOTON },
    });
  },

  /**
   * Un error que tiene salida: además de "Entendido" ofrece ir a resolverlo.
   * Para cuando lo que falta no está en esta pantalla —una resolución de la
   * DIAN, una cuenta del plan— y decirlo sin llevar hasta ahí deja al usuario
   * buscando por el menú.
   */
  errorConSalida(
    mensaje: string,
    salida: { etiqueta: string; ir: () => void },
    detalle?: string,
  ): void {
    void Swal.fire({
      icon: "error",
      title: mensaje,
      text: detalle,
      showCancelButton: true,
      confirmButtonText: salida.etiqueta,
      cancelButtonText: "Entendido",
      theme: tema(),
      buttonsStyling: false,
      customClass: { confirmButton: BOTON, cancelButton: BOTON_SECUNDARIO },
    }).then((r) => {
      if (r.isConfirmed) salida.ir();
    });
  },

  /**
   * Una pregunta que el usuario tiene que responder antes de seguir, cuando
   * lo que va a pasar no es reversible del todo. Devuelve si confirmó.
   *
   * A diferencia de `advertencia`, que solo informa: acá el "sí" hace algo.
   */
  async confirmar(
    mensaje: string,
    detalle: string,
    etiquetaConfirmar = "Sí, continuar",
  ): Promise<boolean> {
    const r = await Swal.fire({
      icon: "warning",
      title: mensaje,
      text: detalle,
      showCancelButton: true,
      confirmButtonText: etiquetaConfirmar,
      cancelButtonText: "Cancelar",
      theme: tema(),
      buttonsStyling: false,
      customClass: { confirmButton: BOTON, cancelButton: BOTON_SECUNDARIO },
    });
    return r.isConfirmed;
  },

  advertencia(mensaje: string, detalle?: string): void {
    void Swal.fire({
      icon: "warning",
      title: mensaje,
      text: detalle,
      confirmButtonText: "Entendido",
      theme: tema(),
      buttonsStyling: false,
      customClass: { confirmButton: BOTON },
    });
  },
};
