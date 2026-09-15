FROM node:24.11.0-alpine AS build

RUN corepack enable \
  && corepack prepare pnpm@11.20.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm generate

FROM nginx:1.30.4-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/.output/public /usr/share/nginx/html

EXPOSE 80

