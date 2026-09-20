import { Rotulo, TituloSeccion, Visto } from "./Marca";
import styles from "../landing.module.css";

/**
 * Dos públicos que no se parecen: el que sabe de partida doble y el que no.
 *
 * Van en tarjetas de peso visual distinto —una clara, otra oscura— porque no
 * son dos opciones equivalentes de un mismo menú: son dos lecturas del mismo
 * producto, y cada quien reconoce la suya antes de leer el titular.
 */
const PUBLICOS = [
  {
    letra: "A",
    titulo: "Contadores ",
    tituloCursiva: "independientes",
    texto:
      "Deja de digitar facturas y dedica tu tiempo al análisis y la asesoría. Atiende más clientes con el mismo esfuerzo.",
    puntos: [
      "Varias empresas desde una sola cuenta",
      "Tú apruebas; la IA no contabiliza sin tu criterio",
      "Cada asiento con su soporte y su explicación",
    ],
    oscura: false,
  },
  {
    letra: "B",
    titulo: "Pymes ",
    tituloCursiva: "y sus dueños",
    texto:
      "Ten tu contabilidad al día sin saber de débitos y créditos. Sube tus facturas y el sistema se encarga del resto.",
    puntos: [
      "Sin conocimientos contables",
      "Libros listos para tu contador cuando los necesite",
      "Sabes cómo va tu negocio sin esperar al cierre",
    ],
    oscura: true,
  },
];

export function ParaQuien() {
  return (
    <section id="para-quien" className={`${styles.ancla} py-24 lg:py-32`}>
      <div className="mx-auto flex max-w-[1152px] flex-col gap-10 px-6 lg:gap-16">
        <div className={`${styles.rv} flex max-w-[820px] flex-col gap-4.5`}>
          <Rotulo>04 — Para quién</Rotulo>
          <TituloSeccion className="font-serif text-[clamp(2.25rem,5.5vw,4rem)] leading-[1.02] tracking-[-1.4px]">
            Para quien lleva los libros,{" "}
            <span className="italic">y para quien los necesita.</span>
          </TituloSeccion>
        </div>

        <ul className="grid list-none grid-cols-1 gap-5 p-0 lg:grid-cols-2">
          {PUBLICOS.map(({ letra, titulo, tituloCursiva, texto, puntos, oscura }, i) => (
            <li key={letra} className={`${styles.rv} ${[styles.e1, styles.e3][i]}`}>
              <article
                className={`${styles.tarjeta} ${oscura ? styles.trama : ""} flex h-full flex-col gap-5 rounded-[1.05rem] border p-8 sm:p-11 ${
                  oscura ? "border-rail text-rail-foreground" : "border-border bg-card"
                }`}
              >
                <span
                  className={`font-mono text-xs ${oscura ? "text-rail-muted" : "text-muted-foreground"}`}
                >
                  {letra}
                </span>
                <h3 className="m-0 font-serif text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.05] tracking-[-0.6px]">
                  {titulo}
                  <span className="italic">{tituloCursiva}</span>
                </h3>
                <p
                  className={`m-0 text-base leading-relaxed ${
                    oscura ? "text-rail-muted" : "text-muted-foreground"
                  }`}
                >
                  {texto}
                </p>
                <div
                  className={`flex flex-col gap-3 border-t pt-5 text-[15px] ${
                    oscura ? "border-rail-line" : "border-border"
                  }`}
                >
                  {puntos.map((punto) => (
                    <div key={punto} className="flex gap-2.5">
                      <Visto
                        className={`mt-0.5 shrink-0 ${oscura ? "text-rail-foreground" : "text-foreground"}`}
                      />
                      {punto}
                    </div>
                  ))}
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
