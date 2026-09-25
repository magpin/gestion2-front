import { Maria } from "@/modules/asistente/components/Maria";
import { Rotulo, TituloSeccion, Visto } from "./Marca";
import styles from "../landing.module.css";

/**
 * «04 — Revisión». Antes se llamaba «Auditoría» y decía «una IA registra, otra
 * revisa»: sugería una compuerta previa que no existe. Lo que existe, y es lo
 * que se cuenta: antes de aprobar, María comprueba las sumas, el proveedor y
 * que no esté repetida; después, revisa los libros enteros (`GET /revision`).
 *
 * La tarjeta muestra el caso que importa: dos comprobaciones en verde y una
 * alerta, en la voz de María y con su cara de espera. El texto de la alerta va
 * en neutro; el ámbar es el borde y la cara.
 */
const COMPROBACIONES = ["Las sumas del papel cuadran", "Proveedor encontrado por NIT"];

export function Revision() {
  return (
    <section
      id="revision"
      className={`${styles.ancla} border-y border-border bg-card py-18 sm:py-24 lg:py-32`}
    >
      <div className="mx-auto grid max-w-[1152px] items-center gap-12 px-6 lg:grid-cols-2 lg:gap-24">
        <div className={`${styles.rv} flex flex-col gap-5.5`}>
          <Rotulo>04 — Revisión</Rotulo>
          <TituloSeccion className="font-serif text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.98] tracking-[-1.6px]">
            María propone.
            <br />
            <span className="italic text-brand-text">Vos decidís.</span>
          </TituloSeccion>
          <p className="m-0 text-[17px] leading-[1.65] text-muted-foreground">
            Antes de que la apruebes, María comprueba que las sumas de la factura cuadren, que el
            proveedor exista y que no la hayas registrado ya. Si algo no encaja, la aparta y te
            dice por qué.
          </p>
          <p className="m-0 text-[17px] leading-[1.65] text-muted-foreground">
            Y cuando querés, revisa tus libros enteros y te señala lo que no cuadra.
          </p>
        </div>

        <div className={`${styles.rv} relative`} aria-hidden="true">
          {/* La placa oscura detrás, corrida: da profundidad sin una sombra más. */}
          <div
            className={`${styles.tramaFina} absolute inset-[40px_-20px_-20px_40px] rounded-[1.35rem] max-sm:inset-[16px_-8px_-8px_16px]`}
          />
          <div
            className={`${styles.sombraTarjeta} relative flex flex-col gap-1 rounded-[1.05rem] border border-border bg-card p-5 sm:p-7`}
          >
            <div className="mb-2 flex items-center justify-between gap-3 border-b border-border pb-4">
              <span className="font-mono text-[13px] font-medium">Revisión · Factura FT-9012</span>
              <span className="shrink-0 text-xs text-muted-foreground">3 comprobaciones</span>
            </div>

            {COMPROBACIONES.map((texto, i) => (
              <div
                key={texto}
                className={`${styles.rvFila} ${i === 0 ? styles.e2 : styles.e3} flex items-center gap-3 p-3`}
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success/15">
                  <Visto size={14} strokeWidth={2.6} className="text-success" />
                </span>
                <span className="text-sm">{texto}</span>
              </div>
            ))}

            <div
              className={`${styles.rvFila} ${styles.e5} mt-1 flex items-start gap-3 rounded-[0.6rem] border border-warning/30 bg-warning/10 px-3 py-3.5`}
            >
              <Maria estado="espera" tamano={32} className="mt-0.5" />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">María · posible factura repetida</span>
                <span className="text-[13px] leading-normal text-muted-foreground">
                  La FT-9012 parece repetida: ya hay una igual registrada el 2 sep. No la registro
                  hasta que me digas.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
