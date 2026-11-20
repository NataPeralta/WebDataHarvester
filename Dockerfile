FROM node:22-alpine AS frontend
WORKDIR /src
COPY docs ./docs
COPY scripts ./scripts
RUN node scripts/build.mjs

FROM node:22-alpine
WORKDIR /app

COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm install --omit=dev

COPY server/ ./server/
COPY --from=frontend /src/dist ./dist

ENV NODE_ENV=production
ENV PORT=8097
EXPOSE 8097
WORKDIR /app/server
CMD ["node", "index.js"]
