/**
 * El dígito de verificación de un NIT.
 *
 * No es un dato que alguien elija: es una función del NIT, y la base lo trata
 * como tal —`ck_empresa_dv` y `ck_tercero_dv` lo recalculan con `fn_dv_nit` y
 * rechazan la fila si no coincide—. Pedirlo tecleado solo produce el error
 * "El digito de verificacion no corresponde al NIT" en el peor momento: después
 * de llenar el formulario entero.
 *
 * Los pesos y el orden salen de la Resolución DIAN: se recorre el NIT de derecha
 * a izquierda multiplicando cada dígito por su peso, y el resto de dividir la
 * suma entre 11 decide. Es la misma cuenta que hace `fn_dv_nit` en Postgres, y
 * las dos tienen que dar igual siempre.
 */
const PESOS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

/**
 * Devuelve el dígito como texto, o cadena vacía si el NIT todavía no es válido
 * —vacío, con letras, o de más de quince dígitos—. Vacío y no un cero: un cero
 * es un DV legítimo y confundirlos haría pasar por bueno un NIT a medio escribir.
 */
export function digitoVerificacion(nit: string): string {
  const limpio = nit.replace(/\D/g, "");
  if (limpio.length === 0 || limpio.length > PESOS.length) return "";

  let suma = 0;
  for (let i = 0; i < limpio.length; i++) {
    suma += Number(limpio[limpio.length - 1 - i]) * PESOS[i]!;
  }

  const resto = suma % 11;
  return String(resto <= 1 ? resto : 11 - resto);
}
