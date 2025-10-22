# --- Build stage ---
FROM registry.redhat.io/ubi9/nodejs-20:9.6-1760386460 AS build
WORKDIR /app

COPY . ./

#COPY package*.json ./

#ENV NPM_CONFIG_LEGACY_PEER_DEPS=true
#RUN npm install --include=dev --no-audit --no-fund --legacy-peer-deps || (rm -f package-lock.json && npm install --include=dev --no-audit --no-fund --legacy-peer-deps)
RUN npm i --force
#COPY . ./

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
#ENV NODE_ENV=production

#RUN npx tsc -v >/dev/null 2>&1 || npm i -D typescript
#RUN npx refine -v >/dev/null 2>&1 || npm i -D @refinedev/cli

RUN npm run build

# --- Runtime (UBI Nginx) ---
FROM registry.redhat.io/ubi10/nginx-126:10.0-1760573692
#WORKDIR /opt/app-root/src   # UBI Nginx docroot

COPY --from=build /app/dist/ .

#RUN mkdir -p /opt/app-root/etc/nginx.default.d
#COPY deploy/spa.conf /opt/app-root/etc/nginx.default.d/zz-spa.conf
COPY deploy/nginx.conf .

EXPOSE 8080
CMD nginx -g "daemon off;"
