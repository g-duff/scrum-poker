# syntax=docker/dockerfile:1

FROM node:26-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
COPY shared/package.json shared/package.json
RUN npm ci

FROM deps AS build-web
COPY . .
RUN npm run build --workspace=web

FROM base AS production-deps
COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
COPY shared/package.json shared/package.json
RUN npm ci --omit=dev

FROM base AS runtime
ENV NODE_ENV=production
RUN groupadd --system app && useradd --system --gid app --no-create-home app

COPY --chown=app:app --from=production-deps /app/node_modules ./node_modules
COPY --chown=app:app --from=production-deps /app/package.json ./package.json
COPY --chown=app:app server/package.json server/package.json
COPY --chown=app:app server/src server/src
COPY --chown=app:app shared/package.json shared/package.json
COPY --chown=app:app shared/src shared/src
COPY --chown=app:app web/package.json web/package.json
COPY --chown=app:app --from=build-web /app/web/dist web/dist

USER app

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://localhost:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server/src/shell/index.ts"]
