FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile && node standalone/build.mjs
FROM node:24-bookworm-slim
WORKDIR /app
COPY --from=build /app/standalone-dist/ ./
ENV NODE_ENV=production REINO_DATA_DIR=/data PORT=3000
VOLUME /data
EXPOSE 3000
CMD ["node","server/runtime.mjs"]
