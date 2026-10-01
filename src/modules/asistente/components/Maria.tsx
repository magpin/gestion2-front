"use client";

import { useId, useMemo } from "react";

import { cn } from "@/lib/utils";
import styles from "./maria.module.css";
import {
  grosorDelAro,
  ladoDelAnillo,
  ladoDelArco,
  MINIMO_ARCO_TAMANO,
  MINIMO_ONDAS,
  radioDelArco,
  RECETAS,
  trazoDeAro,
  trazoDelArco,
  type Intensidad,
} from "./ondas";

/**
 * La cara de María.
 *
 * Un componente con parámetros, no once componentes: la geometría entera sale
 * de multiplicar el tamaño por seis números que salieron de medir las láminas
 * de `mocks/maria-identidad/` en trece tamaños distintos. El plan que los explica es
 * `docs/planes/maria.md`.
 *
 * **La cara no la decide la pantalla: la decide lo que está pasando.** Un
 * estado que no corresponde a un hecho del backend es una mentira animada, y
 * de esas ya hubo suficientes spinners. Por eso `estado` es obligatorio y no
 * tiene valor por defecto que se pueda dejar puesto por descuido.
 *
 * Es **decorativa**: va con `aria-hidden` y quien la usa pone el texto al
 * lado. Un lector de pantalla nunca debe depender de una cara.
 */
export type EstadoMaria =
  /** Sin nada que hacer. */
  | "reposo"
  /** Está extrayendo documentos. */
  | "leyendo"
  /** Consulta sobre datos ya registrados. */
  | "pensando"
  /** Registrando, conciliando, creando un tercero. */
  | "trabajando"
  /** Terminó y algo quedó apartado esperando una decisión. */
  | "espera"
  /** Terminó y no quedó nada pendiente. */
  | "lista"
  /** La IA está desactivada para la empresa. */
  | "dormida"
  /** El documento era ilegible o el servicio falló. */
  | "noPude"
  /** El rol de quien pregunta no ve esa área. */
  | "sinPermiso"
  /** El período contable está cerrado. */
  | "periodoCerrado"
  /** La pregunta es ambigua. */
  | "noEntendi";

/**
 * Las proporciones, medidas sobre las láminas. Cambiar una es cambiar la cara
 * en todos los tamaños a la vez, que es justamente el punto.
 */
const P = {
  ojoAncho: 0.085,
  ojoAlto: 0.22,
  ojoGap: 0.26,
  punto: 0.075,
  /** Los ojos contentos se juntan: sonreír acerca los ojos. */
  arcoGap: 0.175,
  arcoAncho: 0.22,
  arcoAlto: 0.155,
  dormidaAncho: 0.235,
  dormidaAlto: 0.13,
  insigniaAmbar: 0.36,
  insigniaVerde: 0.3,
} as const;

/** Debajo de esto no hay sitio para nada más que los ojos. */
const MINIMO_INSIGNIA = 20;

/**
 * Debajo de esto las manos no se leen como manos: son dos manchas pegadas a
 * la cara. El paquete las dibuja desde 40 px y su rótulo dice 44; 44 es el
 * número que se sostiene mirándolas.
 */
const MINIMO_MANOS = 44;

type Ojos = "pildora" | "contenta" | "cerrada";

/**
 * Qué muestra cada estado. Es el contrato, en una sola tabla.
 *
 * La intensidad va acá y no la elige quien usa el componente: que la cara de
 * «leyendo» ondule fuerte no es una preferencia visual, es lo que significa
 * leer un lote de documentos. Se puede forzar desde fuera, pero el valor
 * correcto es siempre este.
 */
const ESTADOS: Record<
  EstadoMaria,
  {
    ojos: Ojos;
    intensidad?: Intensidad;
    /** La animación que llevan los dos ojos como bloque. */
    gesto?: "barre" | "arriba" | "atiende";
    /** Inclinación o caída del bloque de ojos, en proporción del tamaño. */
    ladea?: boolean;
    baja?: boolean;
    /** Las manos tecleando: solo donde hay sitio para verlas. */
    manos?: boolean;
    insignia?: "ambar" | "verde" | "zzz";
    anillo?: boolean;
    adorno?: "lagrima" | "interrogacion" | "palma" | "cruz";
    apagada?: boolean;
  }
> = {
  reposo: { ojos: "pildora" },
  leyendo: { ojos: "pildora", gesto: "barre", intensidad: "alta" },
  pensando: { ojos: "pildora", gesto: "arriba", anillo: true, intensidad: "suave" },
  trabajando: { ojos: "pildora", gesto: "barre", intensidad: "media", manos: true },
  espera: { ojos: "pildora", gesto: "atiende", insignia: "ambar" },
  lista: { ojos: "contenta", insignia: "verde" },
  dormida: { ojos: "cerrada", insignia: "zzz", apagada: true },
  noPude: { ojos: "pildora", baja: true, adorno: "lagrima" },
  sinPermiso: { ojos: "pildora", adorno: "palma" },
  periodoCerrado: { ojos: "pildora", adorno: "cruz" },
  noEntendi: { ojos: "pildora", ladea: true, adorno: "interrogacion" },
};

/**
 * Un retardo estable entre 0 y 2 s, sacado del `useId` de React.
 *
 * Tiene que ser estable porque el servidor y el navegador pintan lo mismo: un
 * `Math.random()` acá rompería la hidratación. Y tiene que ser distinto por
 * instancia porque **dos caras parpadeando al mismo tiempo se ven a máquina**.
 */
function retardoDe(id: string): number {
  let suma = 0;
  for (let i = 0; i < id.length; i += 1) suma = (suma * 31 + id.charCodeAt(i)) % 2000;
  return suma;
}

export function Maria({
  estado,
  tamano = 28,
  intensidad,
  progreso,
  invertida = false,
  saluda,
  llama,
  aprueba,
  mirada,
  recorre = false,
  className,
}: {
  estado: EstadoMaria;
  /** En píxeles. Todo lo demás se calcula a partir de acá. */
  tamano?: number;
  /**
   * Cuánto ondula el anillo. Se deduce del estado y casi nunca hay que
   * pasarla: está para los sitios donde la misma cara ilustra otra cosa, como
   * la pantalla de carga.
   */
  intensidad?: Intensidad;
  /**
   * Cuánto lleva hecho, entre 0 y 1, cuando hay una cuenta de por medio.
   *
   * Si viene, **reemplaza al anillo de ondas**: las dos cosas a la vez serían
   * dos anillos girando a distinta velocidad. Y tiene que ser un avance de
   * verdad, no una estimación: media docena de barras de progreso falsas ya
   * enseñaron que eso se nota.
   */
  progreso?: number;
  /**
   * Sobre fondo oscuro: la cara se aclara y los ojos se oscurecen.
   *
   * **El punto de marca no se invierte nunca**, ni acá ni en ningún lado: es
   * lo único que dice que esto no es una persona.
   */
  invertida?: boolean;
  /**
   * Saluda con la mano. Es un momento —abrir una conversación—, no un estado:
   * por eso se pide desde fuera y no sale de la tabla.
   */
  saluda?: boolean;
  /**
   * Levanta la mano: algo espera la decisión de quien mira. Es el «te llama»
   * de la lámina `Cara`, y va con la cara de `espera`.
   */
  llama?: boolean;
  /**
   * La mano aparece de golpe, una sola vez: terminó de aprobarse todo lo que
   * quedaba. El «aprobado» de la lámina `Cara`, con los ojos contentos.
   */
  aprueba?: boolean;
  /**
   * Hacia dónde mira, cuando hay un campo activo que seguir. Desplaza el
   * bloque de ojos un 7 % del diámetro, y siempre un poco hacia abajo: mira
   * al campo, no al horizonte.
   */
  mirada?: "izquierda" | "centro" | "derecha";
  /**
   * Mira alrededor, despacio: el barrido de «leyendo» a 8 s. Para una cara
   * quieta que no está haciendo nada pero tampoco está dormida —la bienvenida—.
   * Si el estado ya trae su propio gesto, manda el del estado.
   */
  recorre?: boolean;
  className?: string;
}) {
  const conf = ESTADOS[estado];
  const retardo = retardoDe(useId());
  const px = (proporcion: number) => Number((tamano * proporcion).toFixed(1));

  // Invertir es intercambiar el disco y los ojos, nada más. El punto naranja
  // no entra en el trato.
  const tinta = invertida ? "var(--primary-foreground)" : "var(--primary)";
  const hueco = invertida ? "var(--primary)" : "var(--primary-foreground)";

  const ojo = {
    width: px(P.ojoAncho),
    height: px(P.ojoAlto),
    borderRadius: 999,
    background: conf.apagada ? "var(--muted-foreground)" : hueco,
  };

  const desplazamiento =
    mirada === undefined || mirada === "centro"
      ? undefined
      : `translate(${mirada === "izquierda" ? "-" : ""}${px(0.07)}px, ${px(0.03)}px)`;

  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: tamano, height: tamano }}
    >
      {/* Las ondas van primero: quedan detrás de todo lo demás. Y se callan
          cuando hay un avance que contar, que dice mucho más que ellas. */}
      {!conf.apagada &&
        (progreso === undefined
          ? tamano >= MINIMO_ONDAS && (
              <Ondas tamano={tamano} intensidad={intensidad ?? conf.intensidad ?? "calma"} />
            )
          : tamano >= MINIMO_ARCO_TAMANO && <Avance tamano={tamano} progreso={progreso} />)}

      {conf.anillo && <span className={styles.aro} />}

      {/* Las manos van antes del disco: asoman por detrás, como un brazo.
          Debajo de 44 px no caben: serían dos manchas pegadas a la cara. */}
      {conf.manos === true && tamano >= MINIMO_MANOS && (
        <>
          <Mano tamano={tamano} color={tinta} lado="izquierda" arriba={0.58} animacion={styles.teclea} />
          <Mano tamano={tamano} color={tinta} lado="derecha" arriba={0.58} animacion={styles.tecleaTarde} />
        </>
      )}

      {saluda === true && tamano >= MINIMO_MANOS && (
        <Mano tamano={tamano} color={tinta} lado="derecha" arriba={0.34} animacion={styles.saluda} />
      )}

      {/* La mano levantada asoma por encima de la cabeza: −8 px sobre 64 en
          la lámina. Se balancea, no saluda: pide la palabra. */}
      {llama === true && tamano >= MINIMO_MANOS && (
        <Mano tamano={tamano} color={tinta} lado="derecha" arriba={-0.125} animacion={styles.levanta} />
      )}

      {/* La de «aprobado» aparece a media altura, crece un poco de más y se
          queda: es un momento, no una animación que se repite. */}
      {aprueba === true && tamano >= MINIMO_MANOS && (
        <Mano tamano={tamano} color={tinta} lado="derecha" arriba={0.34} animacion={styles.aparece} />
      )}

      {/* La palma va antes del disco: asoma por detrás, como un brazo. */}
      {conf.adorno === "palma" && <Palma tamano={tamano} color={tinta} />}

      {/* El disco. Nunca lleva borde ni sombra. */}
      <span
        className="absolute inset-0 flex items-center justify-center rounded-full"
        style={{ background: conf.apagada ? "var(--muted)" : tinta }}
      >
        <span
          className={cn(
            "flex items-center",
            styles.transicion,
            conf.gesto === "barre" && styles.barre,
            conf.gesto === "arriba" && styles.arriba,
            conf.gesto === "atiende" && styles.atiende,
            recorre && conf.gesto === undefined && styles.recorre,
          )}
          style={{
            gap: px(conf.ojos === "pildora" ? P.ojoGap : P.arcoGap),
            transform:
              desplazamiento ??
              (conf.ladea ? "rotate(-8deg)" : conf.baja ? `translateY(${px(0.0625)}px)` : undefined),
          }}
        >
          {conf.ojos === "pildora" ? (
            <>
              <span className={styles.ojo} style={{ ...ojo, animationDelay: `${retardo}ms` }} />
              <span
                className={styles.ojo}
                style={{ ...ojo, animationDelay: `${retardo + 80}ms` }}
              />
            </>
          ) : conf.ojos === "contenta" ? (
            <>
              <Arco tamano={tamano} color={hueco} />
              <Arco tamano={tamano} color={hueco} />
            </>
          ) : (
            <>
              <ArcoDormido tamano={tamano} />
              <ArcoDormido tamano={tamano} />
            </>
          )}
        </span>
      </span>

      {/* El punto de la coronilla: lo único que nunca cambia de color, porque
          es lo que dice que esto no es una persona.

          Por eso lleva un mínimo de 2 px: la proporción lo dejaría en 1,2 px a
          tamaño de favicon, y ahí simplemente no se ve. Un distintivo que se
          pierde justo donde más falta hace no es un distintivo. */}
      <span
        className="absolute rounded-full"
        style={{
          left: "50%",
          top: Math.max(1, Math.round(px(P.punto))),
          transform: "translateX(-50%)",
          width: Math.max(2, px(P.punto)),
          height: Math.max(2, px(P.punto)),
          background: conf.apagada ? "var(--muted-foreground)" : "var(--brand)",
        }}
      />

      {/* Los brazos cruzados sí van por delante: tapan la cara a propósito. */}
      {conf.adorno === "cruz" && <Cruz tamano={tamano} color={tinta} />}
      {conf.adorno === "lagrima" && <Lagrima tamano={tamano} />}
      {conf.adorno === "interrogacion" && <Interrogacion tamano={tamano} />}

      {tamano >= MINIMO_INSIGNIA && conf.insignia === "ambar" && <Admiracion tamano={tamano} />}
      {tamano >= MINIMO_INSIGNIA && conf.insignia === "verde" && <Visto tamano={tamano} />}
      {tamano >= MINIMO_INSIGNIA && conf.insignia === "zzz" && <Zetas tamano={tamano} />}
    </span>
  );
}

/**
 * El anillo de ondas.
 *
 * Un solo SVG con los aros adentro, no uno por aro: son tres capas del mismo
 * dibujo. El trazo se recalcula solo cuando cambia el tamaño o la intensidad,
 * que es casi nunca.
 */
function Ondas({ tamano, intensidad }: { tamano: number; intensidad: Intensidad }) {
  const receta = RECETAS[intensidad];
  const lado = ladoDelAnillo(tamano);
  const origen = Math.round(tamano * 0.95);

  const trazos = useMemo(
    () => receta.aros.map((_, i) => trazoDeAro(tamano, i, receta)),
    [tamano, receta],
  );

  return (
    <span
      className={cn(
        "pointer-events-none absolute",
        receta.respira === "lento" && styles.respira,
        receta.respira === "rapido" && styles.respiraRapido,
      )}
      style={{
        left: "50%",
        top: "50%",
        width: lado,
        height: lado,
        transform: "translate(-50%, -50%)",
      }}
    >
      <svg
        width={lado}
        height={lado}
        viewBox={`0 0 ${lado} ${lado}`}
        fill="none"
        className={styles.onda}
        style={{ overflow: "visible" }}
      >
        {receta.aros.map((aro, i) => (
          <path
            key={i}
            d={trazos[i]}
            // El de adentro es el de marca; los otros, neutros. Tres naranjas
            // serían una alarma, y esto no avisa de nada: acompaña.
            stroke={i === 0 ? "var(--brand)" : "var(--muted-foreground)"}
            strokeWidth={grosorDelAro(aro.grosor, tamano)}
            opacity={aro.opacidad}
            // Pares en un sentido, impares en el otro.
            className={i % 2 === 0 ? styles.gira : styles.giraAlReves}
            style={{
              transformOrigin: `${origen}px ${origen}px`,
              animationDuration: `${aro.vuelta}s`,
              // Pasar de esperar a trabajar es un fundido de medio segundo, no
              // un salto: lo que cambia entre intensidades es cuánto se ve y
              // cuánto pesa cada aro, y las dos cosas se pueden transicionar.
              transition: "opacity 500ms ease-out, stroke-width 500ms ease-out",
            }}
          />
        ))}
      </svg>
    </span>
  );
}

/**
 * El arco de avance.
 *
 * Arranca en las doce y gira en sentido horario, como un reloj: es la única
 * forma en que nadie tiene que preguntar para dónde va. Y el trazo se anima en
 * 400 ms, porque el avance llega a saltos —un documento leído, otro— y saltar
 * de 3/12 a 4/12 de golpe se ve como un parpadeo.
 */
function Avance({ tamano, progreso }: { tamano: number; progreso: number }) {
  const lado = ladoDelArco(tamano);
  const radio = radioDelArco(lado);
  const centro = lado / 2;
  const grosor = Math.max(2, Number((tamano * 0.054).toFixed(1)));

  return (
    <span
      className="pointer-events-none absolute"
      style={{
        left: "50%",
        top: "50%",
        width: lado,
        height: lado,
        transform: "translate(-50%, -50%)",
      }}
    >
      <svg width={lado} height={lado} viewBox={`0 0 ${lado} ${lado}`} fill="none">
        <circle cx={centro} cy={centro} r={radio} stroke="var(--muted)" strokeWidth={grosor} />
        <circle
          cx={centro}
          cy={centro}
          r={radio}
          stroke="var(--brand)"
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={trazoDelArco(progreso, radio)}
          transform={`rotate(-90 ${centro} ${centro})`}
          style={{ transition: "stroke-dasharray 400ms cubic-bezier(0.2, 0.8, 0.2, 1)" }}
        />
      </svg>
    </span>
  );
}

/** El ojo contento: un arco hacia arriba. */
function Arco({ tamano, color }: { tamano: number; color: string }) {
  return (
    <svg
      width={Math.round(tamano * P.arcoAncho)}
      height={Math.round(tamano * P.arcoAlto)}
      viewBox="0 0 20 12"
      fill="none"
    >
      <path
        d="M2 10 Q 10 -1 18 10"
        stroke={color}
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** El ojo dormido: el mismo arco, al revés. */
function ArcoDormido({ tamano }: { tamano: number }) {
  return (
    <svg
      width={Math.round(tamano * P.dormidaAncho)}
      height={Math.round(tamano * P.dormidaAlto)}
      viewBox="0 0 20 12"
      fill="none"
    >
      <path
        d="M2 4 Q 10 12 18 4"
        stroke="var(--muted-foreground)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * El distintivo ámbar: un signo de admiración hecho con dos píldoras.
 *
 * Es "te toca a ti", y por eso late: es lo único de la pantalla que pide algo.
 */
function Admiracion({ tamano }: { tamano: number }) {
  const lado = Math.round(tamano * P.insigniaAmbar);
  const ancho = Math.max(1, Math.round(tamano * 0.045));
  return (
    <span
      className={cn("absolute flex flex-col items-center justify-center rounded-full", styles.late)}
      style={{
        right: -Math.round(tamano * 0.047),
        top: -Math.round(tamano * 0.047),
        width: lado,
        height: lado,
        gap: 1,
        background: "var(--warning)",
        border: "2px solid var(--card)",
        boxSizing: "border-box",
      }}
    >
      {/* El blanco de la paleta, no un hex suelto: es el icono dentro del
          color de estado, y no se invierte con el tema porque el ámbar y el
          verde tampoco lo hacen. */}
      <span
        className="block rounded-full"
        style={{ width: ancho, height: Math.round(tamano * 0.105), background: "var(--neutral-0)" }}
      />
      <span
        className="block rounded-full"
        style={{ width: ancho, height: ancho, background: "var(--neutral-0)" }}
      />
    </span>
  );
}

/** El distintivo verde: terminó y no quedó nada. */
function Visto({ tamano }: { tamano: number }) {
  const lado = Math.round(tamano * P.insigniaVerde);
  const icono = Math.round(tamano * 0.16);
  return (
    <span
      className="absolute flex items-center justify-center rounded-full"
      style={{
        right: -1,
        bottom: -1,
        width: lado,
        height: lado,
        background: "var(--success)",
        border: "2px solid var(--card)",
        boxSizing: "border-box",
      }}
    >
      <svg
        width={icono}
        height={icono}
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--neutral-0)"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12l5 5L20 7" />
      </svg>
    </span>
  );
}

/** Las zetas de dormida. Tres, de tamaño creciente y desfasadas. */
function Zetas({ tamano }: { tamano: number }) {
  return (
    <>
      {[
        { escala: 0.2, derecha: 0.08, retardo: 0 },
        { escala: 0.25, derecha: 0.095, retardo: 850 },
        { escala: 0.3, derecha: 0.125, retardo: 1700 },
      ].map((z) => (
        <span
          key={z.retardo}
          className={cn("absolute font-semibold", styles.duerme)}
          style={{
            right: -Math.round(tamano * z.derecha),
            top: -Math.round(tamano * 0.047),
            fontSize: Math.round(tamano * z.escala),
            lineHeight: 1,
            color: "var(--muted-foreground)",
            animationDelay: `${z.retardo}ms`,
          }}
        >
          z
        </span>
      ))}
    </>
  );
}

/** La lágrima de «no pude». Blanca, no roja: no es culpa de quien mira. */
function Lagrima({ tamano }: { tamano: number }) {
  const lado = Math.round(tamano * 0.09);
  return (
    <span
      className={cn("absolute rounded-full", styles.llora)}
      style={{
        left: `${28}%`,
        top: "58%",
        width: lado,
        height: Math.round(lado * 1.3),
        background: "var(--primary-foreground)",
        opacity: 0.85,
      }}
    />
  );
}

/** La interrogación de «no entendí»: flota sobre la cabeza. */
function Interrogacion({ tamano }: { tamano: number }) {
  return (
    <span
      className={cn("absolute font-bold", styles.pregunta)}
      style={{
        right: -Math.round(tamano * 0.06),
        top: -Math.round(tamano * 0.28),
        fontSize: Math.round(tamano * 0.375),
        lineHeight: 1,
        color: "var(--muted-foreground)",
      }}
    >
      ?
    </span>
  );
}

/** La palma de «sin permiso»: alto. Asoma por el costado, no tapa la cara. */
function Palma({ tamano, color }: { tamano: number; color: string }) {
  const ancho = Math.round(tamano * 0.28);
  return (
    <span
      className="absolute block"
      style={{
        right: -Math.round(tamano * 0.17),
        top: Math.round(tamano * 0.32),
        width: ancho,
        height: Math.round(tamano * 0.33),
      }}
    >
      <span
        className="absolute inset-0"
        style={{ borderRadius: Math.round(tamano * 0.115), background: color }}
      />
      <span
        className="absolute rounded-full"
        style={{
          left: -Math.round(tamano * 0.065),
          top: Math.round(tamano * 0.09),
          width: Math.round(tamano * 0.125),
          height: Math.round(tamano * 0.125),
          background: color,
        }}
      />
    </span>
  );
}

/**
 * Una mano: palma redondeada y pulgar.
 *
 * Son dos `span`, no un SVG, por la misma razón que el resto de la cara: son
 * dos formas. Van **antes del disco** en el marcado, así que asoman por detrás
 * como asomaría un brazo, y la cara las tapa por delante.
 */
function Mano({
  tamano,
  color,
  lado,
  arriba,
  animacion,
}: {
  tamano: number;
  color: string;
  lado: "izquierda" | "derecha";
  /** Desde arriba, en proporción del tamaño. */
  arriba: number;
  animacion?: string;
}) {
  const costado = -Math.round(tamano * 0.17);
  const pulgar = Math.round(tamano * 0.125);
  const asomo = -Math.round(tamano * 0.065);
  const esIzquierda = lado === "izquierda";

  return (
    <span
      className={cn("absolute block", animacion)}
      style={{
        [esIzquierda ? "left" : "right"]: costado,
        top: Math.round(tamano * arriba),
        width: Math.round(tamano * 0.26),
        height: Math.round(tamano * 0.3),
      }}
    >
      <span
        className="absolute inset-0"
        style={{ borderRadius: Math.round(tamano * 0.115), background: color }}
      />
      {/* El pulgar mira siempre hacia adentro, hacia la cara. */}
      <span
        className="absolute rounded-full"
        style={{
          [esIzquierda ? "right" : "left"]: asomo,
          top: Math.round(tamano * 0.09),
          width: pulgar,
          height: pulgar,
          background: color,
        }}
      />
    </span>
  );
}

/**
 * Los brazos cruzados de «período cerrado»: ahí no se escribe.
 *
 * Van del mismo color que la cara —son suyos, no un icono encima—, así que lo
 * que se ve son las puntas que sobresalen a los lados. Por eso el aspa es más
 * ancha que el disco: dentro de él no se distinguiría.
 */
function Cruz({ tamano, color }: { tamano: number; color: string }) {
  const ancho = Math.round(tamano * 1.02);
  const alto = Math.max(3, Math.round(tamano * 0.11));
  const filo = Math.max(1, Math.round(tamano * 0.03));
  return (
    <span
      className={cn("absolute block", styles.cruza)}
      style={{
        left: "50%",
        bottom: Math.round(tamano * 0.1),
        width: ancho,
        height: alto * 2.6,
        // El centrado va en el `transform` porque la animación lo sostiene;
        // sin esto, con el movimiento apagado la cruz se iría a un costado.
        transform: "translateX(-50%)",
      }}
    >
      {[22, -22].map((giro) => (
        <span
          key={giro}
          className="absolute rounded-full"
          style={{
            left: 0,
            top: "50%",
            width: ancho,
            height: alto,
            background: color,
            // El filo del color del fondo las despega de la cara, igual que el
            // aro de las insignias: sin él son negro sobre negro.
            border: `${filo}px solid var(--background)`,
            boxSizing: "border-box",
            transform: `translateY(-50%) rotate(${giro}deg)`,
          }}
        />
      ))}
    </span>
  );
}
