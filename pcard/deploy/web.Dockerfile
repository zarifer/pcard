FROM registry.redhat.io/ubi9/nodejs-20:9.6-1760386460 AS build
WORKDIR /app
COPY ./package*.json ./
RUN npm i --omit=dev --force
COPY . ./

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM registry.redhat.io/ubi10/nginx-126:10.0-1760573692
#COPY deploy/nginx.conf ./nginx.conf
COPY --from=build /app/dist .
EXPOSE 8080
CMD nginx -g "daemon off;"

