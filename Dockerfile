# Mismo criterio que el backend: `desarrollo` para trabajar, `produccion` para
# desplegar. Next se construye en su propia etapa porque el resultado —la
# carpeta `standalone`— es lo único que producción necesita del código fuente.
#
# El repo usa pnpm: el lockfile es `pnpm-lock.yaml`. La versión se fija acá
# para que la imagen instale exactamente lo mismo que la máquina de cada uno.

FROM node:24-alpine AS base
WORKDIR /app
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@12.5.1 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS desarrollo
COPY . .
EXPOSE 3000
CMD ["pnpm", "dev"]

FROM base AS construccion
COPY . .
# La URL de la API se hornea en el bundle: `NEXT_PUBLIC_*` se resuelve al
# construir, no al arrancar. Por eso producción necesita construir con la URL
# real, y no alcanza con pasarla como variable del contenedor.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# `output: 'standalone'` deja en `.next/standalone` un `server.js` con solo las
# dependencias que las páginas usan: no hace falta instalar `node_modules` acá,
# y la imagen pesa y consume bastante menos. `public` y `.next/static` no vienen
# incluidos y se copian aparte.
FROM node:24-alpine AS produccion
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=construccion --chown=node:node /app/.next/standalone ./
COPY --from=construccion --chown=node:node /app/.next/static ./.next/static
COPY --from=construccion --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
