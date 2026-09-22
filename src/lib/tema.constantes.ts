/**
 * Los nombres de las cookies del tema, sin `"use client"`.
 *
 * Van aparte porque las lee el servidor —el layout arma el `<html>` con el
 * tema— y las escribe el navegador. Importar un valor desde un módulo de
 * cliente no le da al servidor el valor, sino una referencia: el layout se
 * quedaba siempre en claro por eso.
 */
export const COOKIE_PREFERENCIA = "tema";
export const COOKIE_EFECTIVO = "tema-efectivo";
