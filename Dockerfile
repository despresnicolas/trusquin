# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# `prepare` (svelte-kit sync) échoue sans les sources : sans gravité, relancé par `pnpm build`.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm test && pnpm build

# Dev avec hot reload : les sources sont montées par compose (service `dev`), seules les dépendances viennent de l'image.
FROM deps AS dev
EXPOSE 5173
CMD ["node_modules/.bin/vite", "dev", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]

# Dépendances d'exécution seules (driver postgres) pour le serveur Node.
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile --ignore-scripts

# CLI : le repo à analyser est monté sur /repo, les chemins relatifs partent de là.
FROM deps AS cli
COPY . .
WORKDIR /repo
ENTRYPOINT ["/app/node_modules/.bin/tsx", "/app/cli/sauron.ts"]
CMD ["analyze", "."]

# Interface + API : serveur SvelteKit (adapter-node), cible par défaut.
FROM node:22-alpine AS web
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY package.json ./
COPY --from=prod-deps /app/node_modules node_modules
COPY --from=build /app/build build
EXPOSE 8080
CMD ["node", "build"]
