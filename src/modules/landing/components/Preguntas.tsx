import { Maria } from "@/modules/asistente/components/Maria";
import { Rotulo, TituloSeccion } from "./Marca";
import styles from "../landing.module.css";

/**
 * Las preguntas, todas abiertas. No es un acordeón: son respuestas cortas, y
 * esconderlas detrás de un clic solo agrega un paso para leer lo que cabe en
 * pantalla.
 *
 * Los numerales romanos en cursiva hacen de viñeta y de orden a la vez.
 *
 * ---
 * Redactadas contra lo que el código hace hoy (verificado el 25 sep 2026,
 * `docs/planes/landing-maria.md` §4):
 *  - iv: `0006_empresa_dian.sql` guarda resoluciones y credenciales; la emisión
 *    y el envío son del módulo `dian`, que todavía no existe.
 *  - v: aislamiento por empresa con RLS y AES-256-GCM en las credenciales.
 *  - vi: dice qué no lee todavía — la identidad de María pide que la página
 *    diga lo que no hace.
 */
const PREGUNTAS = [
  {
    numeral: "i.",
    pregunta: "¿María reemplaza al contador?",
    respuesta:
      "No. Le quita la digitación. El criterio, la revisión y la firma siguen siendo del contador.",
    conMaria: true,
  },
  {
    numeral: "ii.",
    pregunta: "¿María es una persona?",
    respuesta:
      "No. Es una asistente de IA. Por eso, dentro del sistema, todo lo que ella propone queda marcado como «Propuesto por María», junto a quién lo aprobó y cuándo.",
  },
  {
    numeral: "iii.",
    pregunta: "¿Qué pasa si María se equivoca?",
    respuesta:
      "Nada entra a sus libros sin que alguien lo apruebe: lo que ella no puede confirmar lo aparta con la razón. Y todo asiento se corrige con un contra-asiento, que queda registrado.",
  },
  {
    numeral: "iv.",
    pregunta: "¿Funciona con facturación electrónica?",
    respuesta:
      "El sistema guarda sus resoluciones de numeración y sus credenciales de la DIAN, y numera cada documento contra ellas. La emisión y el envío —CUFE, CUDE y acuses— están en construcción.",
  },
  {
    numeral: "v.",
    pregunta: "¿Dónde quedan mis datos?",
    respuesta:
      "En una base de datos donde cada empresa queda aislada de las demás, incluso dentro de una misma cuenta. Las credenciales sensibles, como el certificado y el PIN de la DIAN, se guardan cifradas.",
  },
  {
    numeral: "vi.",
    pregunta: "¿Lee facturas de venta o extractos del banco?",
    respuesta:
      "Todavía no. Hoy lee facturas de compra, cuentas de cobro, pedidos de clientes y los documentos de su empresa (RUT, Cámara de Comercio, resolución de la DIAN). Los extractos se importan en Tesorería.",
  },
];

export function Preguntas() {
  return (
    <section id="preguntas" className={`${styles.ancla} border-t border-border py-18 sm:py-24 lg:py-32`}>
      <div className="mx-auto grid max-w-[1152px] gap-10 px-6 lg:grid-cols-[1fr_1.5fr] lg:gap-24">
        <div className={`${styles.rv} flex flex-col gap-4.5`}>
          <Rotulo>07 — Preguntas</Rotulo>
          <TituloSeccion className="font-serif text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.02] tracking-[-1.4px]">
            Lo que suelen <span className="italic">preguntar.</span>
          </TituloSeccion>
        </div>

        <dl className="m-0 flex flex-col">
          {PREGUNTAS.map(({ numeral, pregunta, respuesta, conMaria }, i) => (
            <div
              key={numeral}
              className={`${styles.rv} grid grid-cols-[40px_1fr] gap-2 border-t border-border py-6 sm:grid-cols-[48px_1fr] sm:py-7.5 ${
                i === PREGUNTAS.length - 1 ? "border-b" : ""
              }`}
            >
              <span aria-hidden="true" className="font-serif text-2xl italic text-input">
                {numeral}
              </span>
              <div className="flex flex-col gap-2.5">
                <dt className="m-0 flex items-center gap-2.5 text-lg font-semibold">
                  {conMaria && <Maria estado="reposo" tamano={24} />}
                  {pregunta}
                </dt>
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
