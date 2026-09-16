# Mismo criterio que el backend: `desarrollo` para trabajar, `produccion` para
# desplegar. Next se construye en su propia etapa porque el resultado —`.next`—
# es lo único que producción necesita del código fuente.

FROM node:24-alpine AS base
WORKDIR /app
COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile

FROM base AS desarrollo
COPY . .
EXPOSE 3000
CMD ["yarn", "dev"]

FROM base AS construccion
COPY . .
# La URL de la API se hornea en el bundle: `NEXT_PUBLIC_*` se resuelve al
# construir, no al arrancar. Por eso producción necesita construir con la URL
# real, y no alcanza con pasarla como variable del contenedor.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN yarn build

FROM node:24-alpine AS produccion
WORKDIR /app
ENV NODE_ENV=production
COPY package.json yarn.lock ./
RUN corepack enable && yarn install --frozen-lockfile --production
COPY --from=construccion /app/.next ./.next
COPY --from=construccion /app/public ./public
COPY --from=construccion /app/next.config.ts ./
EXPOSE 3000
CMD ["yarn", "start"]
