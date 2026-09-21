"use client";

import { forwardRef } from "react";

/**
 * La hoja del servidor, tal cual, dentro de un `iframe`.
 *
 * `srcdoc` y no `src`: un `src` no puede mandar el token. El `sandbox` deja
 * afuera cualquier script —la hoja no trae, y si algún día trajera no tiene
 * por qué correr— y conserva el mismo origen, que es lo que deja al visor
 * contar las páginas y mandar a imprimir.
 *
 * `estilo` se agrega al final del `<head>`: la miniatura lo usa para sacar el
 * fondo gris y la sombra, que en una tarjeta sobran.
 */
export const HojaIframe = forwardRef<
  HTMLIFrameElement,
  {
    html: string;
    titulo: string;
    estilo?: string;
    className?: string;
    style?: React.CSSProperties;
    onLoad?: (iframe: HTMLIFrameElement) => void;
    decorativa?: boolean;
  }
>(function HojaIframe({ html, titulo, estilo, className, style, onLoad, decorativa }, ref) {
  const documento = estilo ? html.replace("</head>", `<style>${estilo}</style></head>`) : html;
  return (
    <iframe
      ref={ref}
      title={titulo}
      srcDoc={documento}
      sandbox="allow-same-origin allow-modals"
      className={className}
      style={style}
      onLoad={onLoad ? (e) => onLoad(e.currentTarget) : undefined}
      tabIndex={decorativa ? -1 : undefined}
      aria-hidden={decorativa ? true : undefined}
    />
  );
});
