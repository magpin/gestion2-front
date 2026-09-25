import Link from "next/link";

import { CORREO_SOPORTE, PaginaLegal, PorCompletar } from "../components/PaginaLegal";

/**
 * Términos y condiciones de uso.
 *
 * BORRADOR contra lo que el sistema hace hoy (25 sep 2026). Lo central: María
 * propone y no firma; el criterio contable es de quien aprueba; el sistema no
 * emite todavía factura electrónica a la DIAN. Lo revisa un abogado antes de
 * producción; lo marcado con `PorCompletar` falta definirlo.
 */
export function TerminosView() {
  return (
    <PaginaLegal titulo="Términos y condiciones" vigencia="[por definir]">
      <section>
        <h2>1. Qué es ERP Gestión</h2>
        <p>
          ERP Gestión es un sistema contable en línea para empresas colombianas y para quienes
          llevan su contabilidad. Incluye a María, una asistente de inteligencia artificial que lee
          documentos, responde preguntas y propone registros. Lo presta{" "}
          <PorCompletar>razón social</PorCompletar>, NIT <PorCompletar>NIT</PorCompletar> (en
          adelante, «nosotros»).
        </p>
        <p>
          Al crear una cuenta o usar el sistema aceptás estos términos y la{" "}
          <Link href="/tratamiento-de-datos">política de tratamiento de datos</Link>.
        </p>
      </section>

      <section>
        <h2>2. Cuentas, empresas y roles</h2>
        <ul>
          <li>
            Una cuenta puede tener varias empresas y varias personas, cada una con su rol. Quien
            administra la cuenta decide quién entra y qué puede hacer.
          </li>
          <li>
            Cada persona responde por su contraseña y por lo que se haga con su usuario. Si creés
            que alguien entró sin permiso, avisanos enseguida.
          </li>
          <li>Tenés que dar información verdadera, y mantenerla al día.</li>
        </ul>
      </section>

      <section>
        <h2>3. María propone; una persona decide</h2>
        <ul>
          <li>
            María es una asistente de inteligencia artificial, no una persona ni un contador. Lo que
            lee y lo que propone puede tener errores.
          </li>
          <li>
            Nada se asienta sin que una persona lo apruebe. Al aprobar, esa persona hace suyo el
            registro: el criterio contable, la revisión y la firma son de quien lleva la
            contabilidad.
          </li>
          <li>
            Todo lo que propone María queda marcado como «Propuesto por María», junto a quién lo
            aprobó y cuándo.
          </li>
          <li>
            María no reemplaza la asesoría contable, tributaria ni legal de un profesional.
          </li>
        </ul>
      </section>

      <section>
        <h2>4. Lo que el sistema hace y lo que todavía no</h2>
        <p>
          Guarda tus resoluciones de numeración y tus credenciales de la DIAN y numera tus
          documentos contra ellas, pero <strong>todavía no emite ni envía factura electrónica a la
          DIAN</strong> (CUFE, CUDE y acuses están en construcción). Tampoco presenta declaraciones
          de impuestos ni liquida nómina. Mientras eso no exista, cumplir esas obligaciones sigue
          siendo tuyo, con las herramientas que correspondan.
        </p>
      </section>

      <section>
        <h2>5. Tu información</h2>
        <ul>
          <li>
            La información contable que cargás es de tu empresa. Nos das permiso para guardarla y
            procesarla solo para prestarte el servicio.
          </li>
          <li>
            Si cargás datos personales de terceros (clientes, proveedores, empleados), tu empresa es
            la responsable de haberlos obtenido con autorización y de tratarlos según la ley; nosotros
            los tratamos como encargados, por cuenta tuya.
          </li>
          <li>
            Podés pedir una copia de tu información en cualquier momento, y al terminar el servicio
            te la entregamos antes de suprimirla, salvo lo que la ley obligue a conservar.
          </li>
        </ul>
      </section>

      <section>
        <h2>6. Uso aceptable</h2>
        <p>No se permite usar el sistema para:</p>
        <ul>
          <li>Registrar operaciones falsas o ayudar a evadir impuestos.</li>
          <li>Intentar entrar a información de otras empresas o saltarse los permisos.</li>
          <li>Subir archivos con virus o contenido ilegal.</li>
          <li>Copiar, revender o desarmar el sistema sin autorización.</li>
        </ul>
        <p>Si pasa, podemos suspender el acceso mientras se aclara.</p>
      </section>

      <section>
        <h2>7. Disponibilidad y respaldos</h2>
        <p>
          Hacemos lo razonable para que el sistema esté disponible y sacamos respaldos diarios de la
          información, pero puede haber interrupciones por mantenimiento o por fallas ajenas a
          nosotros. Los asientos no se borran: se corrigen con un contra-asiento, que queda
          registrado.
        </p>
      </section>

      <section>
        <h2>8. Precios y pagos</h2>
        <p>
          <PorCompletar>planes, precios, forma de pago, facturación y qué pasa si un pago se atrasa</PorCompletar>.
        </p>
      </section>

      <section>
        <h2>9. Propiedad intelectual</h2>
        <p>
          El sistema, su diseño, sus textos y la marca y la imagen de María son nuestros. Usarlo no
          te transfiere ningún derecho sobre ellos, salvo el de usar el servicio mientras tengas una
          cuenta activa.
        </p>
      </section>

      <section>
        <h2>10. Responsabilidad</h2>
        <p>
          Respondemos por prestar el servicio con diligencia. No respondemos por decisiones
          contables o tributarias tomadas con base en propuestas de María que una persona aprobó,
          ni por información errada que se haya cargado al sistema.{" "}
          <PorCompletar>límite de responsabilidad, a revisar con un abogado según la ley colombiana</PorCompletar>.
        </p>
      </section>

      <section>
        <h2>11. Terminación</h2>
        <p>
          Podés cancelar tu cuenta cuando quieras. Nosotros podemos terminarla por incumplimiento de
          estos términos, con aviso previo salvo en casos graves. En los dos casos te entregamos tu
          información como dice el punto 5.
        </p>
      </section>

      <section>
        <h2>12. Cambios, ley y contacto</h2>
        <p>
          Si cambiamos estos términos, lo avisamos antes de que empiecen a regir. Se rigen por las
          leyes de Colombia, y cualquier diferencia se resuelve ante los jueces de{" "}
          <PorCompletar>ciudad</PorCompletar>. Para cualquier duda:{" "}
          <strong>{CORREO_SOPORTE}</strong> o la página de <Link href="/contacto">contacto</Link>.
        </p>
      </section>
    </PaginaLegal>
  );
}
