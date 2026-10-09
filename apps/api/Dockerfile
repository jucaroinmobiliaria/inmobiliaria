# API de Jucaro — imagen para Render, Fly.io, Railway, Cloud Run, etc.
#   docker build -t jucaro-api apps/api   &&   docker run -p 4000:4000 --env-file apps/api/.env jucaro-api
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npx prisma generate && npx nest build && npm prune --omit=dev --ignore-scripts

FROM node:22-slim
ENV NODE_ENV=production PORT=4000
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
EXPOSE 4000
USER node
CMD ["node", "dist/main.js"]
