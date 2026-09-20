import { Rotulo, TituloSeccion } from "./Marca";
import styles from "../landing.module.css";

/**
 * Tres pasos, y son de verdad una secuencia: el documento llega, la IA
 * registra, la persona aprueba. Por eso van numerados y por eso el tercero se
 * pinta distinto —línea naranja, número naranja—: es el único donde hay alguien
 * decidiendo, y es el argumento entero de la página.
 */
const PASOS = [
  {
    numero: "01",
    titulo: "Llegan los documentos",
    texto:
      "Facturas electrónicas de compra y venta, soportes y extractos. Los subes o llegan solos desde tus canales.",
  },
  {
    numero: "02",
    titulo: "La IA registra",
    texto:
      "Lee cada documento, lo clasifica en el PUC, calcula impuestos y retenciones y arma el asiento completo.",
  },
  {
    numero: "03",
    titulo: "Tú apruebas",
    texto:
      "Revisas solo lo que la auditoría marca. Lo demás ya está cuadrado y listo en tus libros.",
  },
];

export function ComoFunciona() {
  return (
    <section id="como" className={`${styles.ancla} border-b border-border bg-card py-24 lg:py-32`}>
      <div className="mx-auto flex max-w-[1152px] flex-col gap-12 px-6 lg:gap-18">
        <div className={`${styles.rv} flex max-w-[700px] flex-col gap-4.5`}>
          <Rotulo>01 — Cómo funciona</Rotulo>
          <TituloSeccion className="font-serif text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.02] tracking-[-1.4px]">
            Tres pasos. Tú solo haces <span className="italic">el último.</span>
          </TituloSeccion>
        </div>

        <div className="grid gap-12 md:grid-cols-3">
          {PASOS.map(({ numero, titulo, texto }, i) => {
            const esUltimo = i === PASOS.length - 1;
            // La raya de cada paso se dibuja un poco después que la anterior:
            // la hoja se va rayando de izquierda a derecha y de a una, que es
            // el orden en que se leen.
            const escalon = [styles.e1, styles.e2, styles.e3][i];
            return (
              <div key={numero} className={`${styles.rv} ${escalon} flex flex-col gap-4`}>
                <div
                  className={`${styles.rvLine} ${escalon} h-0.5 ${esUltimo ? "bg-brand" : "bg-foreground"}`}
                />
                <span
                  className={`font-serif text-[56px] leading-none italic ${
                    esUltimo ? "text-brand-text" : "text-input"
                  }`}
                >
                  {numero}
                </span>
                <h3 className="m-0 text-[22px] font-semibold tracking-[-0.4px]">{titulo}</h3>
                <p className="m-0 text-base leading-relaxed text-muted-foreground">{texto}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
