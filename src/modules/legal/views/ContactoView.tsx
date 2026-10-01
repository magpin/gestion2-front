import Link from "next/link";

import { CORREO_SOPORTE, PaginaLegal, PorCompletar } from "../components/PaginaLegal";

/** Contacto: soporte, datos personales y quién responde. Borrador. */
export function ContactoView() {
  return (
    <PaginaLegal titulo="Contacto" vigencia="[por definir]">
      <section>
        <h2>Soporte</h2>
        <p>
          Para dudas sobre el sistema, problemas para entrar o algo que no funciona como esperaba:{" "}
          <a href={`mailto:${CORREO_SOPORTE}`}>
            <strong>{CORREO_SOPORTE}</strong>
          </a>
          . Indíquenos su nombre, la empresa y qué estaba haciendo. Respondemos{" "}
          <PorCompletar>horario y tiempo de respuesta</PorCompletar>.
        </p>
      </section>

      <section>
        <h2>Datos personales</h2>
        <p>
          Para conocer, actualizar, corregir o suprimir sus datos, o revocar su autorización,
          escriba al mismo correo con el asunto «Datos personales». Los plazos y el trámite están en
          la <Link href="/tratamiento-de-datos">política de tratamiento de datos</Link>.
        </p>
      </section>

      <section>
        <h2>Quién responde</h2>
        <p>
          <PorCompletar>razón social</PorCompletar> · NIT <PorCompletar>NIT</PorCompletar> ·{" "}
          <PorCompletar>dirección y ciudad</PorCompletar> · <PorCompletar>teléfono</PorCompletar>.
        </p>
      </section>
    </PaginaLegal>
  );
}
