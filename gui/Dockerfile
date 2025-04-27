FROM node:23-alpine
WORKDIR /app
COPY package*.json ./
RUN apk update && \
    apk add --no-cache wireless-tools wpa_supplicant && \
    npm install
COPY . .
EXPOSE 4000
CMD ["node","server.js"]
