# Node 24 ships the built-in node:sqlite module, so there is no native build
# step and no build tools needed.
FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server.js db.js ./
COPY public ./public

ENV NODE_ENV=production
ENV PORT=8080
ENV DB_PATH=/data/guitar.db

# SQLite database lives on a mounted volume so it survives container rebuilds.
VOLUME /data
EXPOSE 8080

CMD ["node", "--disable-warning=ExperimentalWarning", "server.js"]
