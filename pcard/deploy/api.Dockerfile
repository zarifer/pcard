FROM registry.redhat.io/ubi9/nodejs-20:9.6-1760386460 AS base
WORKDIR /app

COPY server/package*.json ./
RUN npm i --omit=dev

# Source
COPY server ./

# non-root
#RUN useradd -m app && chown -R app:app /app
#USER app

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["node", "index.js"]



