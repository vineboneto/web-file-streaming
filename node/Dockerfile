FROM node:20-slim AS base

RUN groupadd -r vine && useradd -r -g vine -d /usr/src/vine -s /sbin/nologin vine


ENV PNPM_HOME="/pnpm" \
    PATH="$PNPM_HOME:$PATH" \
    TZ=America/Sao_Paulo \
    COREPACK_HOME="/usr/src/vine/.corepack"

RUN corepack enable

RUN mkdir -p $COREPACK_HOME && chown -R vine:vine $COREPACK_HOME
RUN mkdir -p /usr/src/vine/public && chown -R vine:vine /usr/src/vine/public

WORKDIR /usr/src/vine
COPY --chown=vine:vine . .

FROM base AS deps
# RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM base
ENV NODE_ENV="production"
COPY --from=deps /usr/src/vine/node_modules /usr/src/vine/node_modules
EXPOSE 3333


CMD [ "pnpm", "start" ]