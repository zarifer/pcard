FROM registry.redhat.io/ubi9/nodejs-20:9.6-1760386460 AS base
WORKDIR /app

# csak a lockok a cache-hez
COPY ./server/package*.json ./
RUN npm i --omit=dev

# forrás
COPY ./server ./

# non-root
#RUN useradd -m app && chown -R app:app /app
#USER app

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD curl -fsS http://127.0.0.1:4000/healthz || exit 1

CMD ["node", "index.js"]
