import { Rotulo, TituloSeccion } from "./Marca";
import styles from "../landing.module.css";

/**
 * Las cuatro preguntas, todas abiertas. No es un acordeón: son cuatro
 * respuestas cortas, y esconderlas detrás de un clic solo agrega un paso para
 * leer lo que cabe en pantalla. Un acordeón sirve cuando hay veinte.
 *
 * Los numerales romanos en cursiva hacen de viñeta y de orden a la vez.
 *
 * ---
 * OJO con las dos últimas. El diseño las traía como placeholder y acá van
 * redactadas contra lo que el código realmente hace hoy:
 *
 *  - iii: `0006_empresa_dian.sql` guarda resoluciones y credenciales, y su
 *    propio comentario dice que «el envío a la DIAN, el CUFE/CUDE y el manejo
 *    de acuses son del módulo `dian`, más adelante». O sea: todavía no emite.
 *  - iv: el aislamiento por empresa es RLS en Postgres y el cifrado es
 *    AES-256-GCM sobre las columnas `_enc` (`cifrado.service.ts`).
 *
 * Las dos son afirmaciones públicas sobre un producto contable. Antes de
 * publicar, que las apruebe alguien que responda por ellas.
 */
const PREGUNTAS = [
  {
    numeral: "i.",
    pregunta: "¿Reemplaza al contador?",
    respuesta:
      "No. Le quita la digitación. El criterio, la revisión y la firma siguen siendo del contador.",
  },
  {
    numeral: "ii.",
    pregunta: "¿Qué pasa si la IA se equivoca?",
    respuesta:
      "Lo que la auditoría no puede confirmar queda en espera y no entra a los libros hasta que alguien lo apruebe. Todo asiento se puede corregir y queda registro del cambio.",
  },
  {
    numeral: "iii.",
    pregunta: "¿Funciona con facturación electrónica?",
    respuesta:
      "El sistema guarda tus resoluciones de numeración y tus credenciales de la DIAN, y numera cada documento contra ellas. La emisión y el envío —CUFE, CUDE y acuses— están en construcción.",
  },
  {
    numeral: "iv.",
    pregunta: "¿Dónde quedan mis datos?",
    respuesta:
      "En una base de datos donde cada empresa queda aislada de las demás, incluso dentro de una misma cuenta. Las credenciales sensibles, como el certificado y el PIN de la DIAN, se guardan cifradas.",
  },
];

export function Preguntas() {
  return (
    <section id="preguntas" className={`${styles.ancla} border-t border-border bg-card py-24 lg:py-32`}>
      <div className="mx-auto grid max-w-[1152px] gap-12 px-6 lg:grid-cols-[1fr_1.5fr] lg:gap-24">
        <div className={`${styles.rv} flex flex-col gap-4.5`}>
          <Rotulo>05 — Preguntas</Rotulo>
          <TituloSeccion className="font-serif text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.02] tracking-[-1.4px]">
            Lo que suelen <span className="italic">preguntar.</span>
          </TituloSeccion>
        </div>

        <dl className="m-0 flex flex-col">
          {PREGUNTAS.map(({ numeral, pregunta, respuesta }, i) => (
            <div
              key={numeral}
              className={`${styles.rv} ${[styles.e1, styles.e2, styles.e3, styles.e4][i]} grid grid-cols-[48px_1fr] gap-2 border-t border-border py-7.5 ${
                i === PREGUNTAS.length - 1 ? "border-b" : ""
              }`}
            >
              <span aria-hidden="true" className="font-serif text-2xl italic text-input">
                {numeral}
              </span>
              <div className="flex flex-col gap-2.5">
                <dt className="m-0 text-lg font-semibold">{pregunta}</dt>
                <dd className="m-0 text-[15px] leading-[1.65] text-muted-foreground">
                  {respuesta}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
