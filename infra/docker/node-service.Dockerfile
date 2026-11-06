# Builds a Node service from the monorepo: --build-arg APP=realtime|worker
# Context must be the repository root.
ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable
WORKDIR /repo

FROM base AS build
ARG APP
COPY . .
RUN pnpm install --frozen-lockfile \
 && pnpm turbo run build --filter=@lst/${APP} \
 && pnpm deploy --filter=@lst/${APP} --prod --legacy /out

FROM node:${NODE_VERSION}-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 4000
CMD ["node", "dist/main.js"]
