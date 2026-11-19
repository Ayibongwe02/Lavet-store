# Lavet Wellness: Node static server + secure Deepgram proxy (zero extra deps)
FROM node:22-alpine

WORKDIR /app

COPY server ./server
COPY *.html ./
COPY css ./css
COPY js ./js
COPY images ./images
COPY package.json ./

ENV PORT=8080 \
    NODE_ENV=production

EXPOSE 8080
USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider "http://127.0.0.1:${PORT}/api/health" || exit 1

CMD ["node", "server/index.js"]
