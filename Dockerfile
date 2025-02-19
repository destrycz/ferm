FROM node:23-alpine
WORKDIR /
COPY package.json package.json
COPY package-lock.json package-lock.json
COPY . .
RUN npm install
COPY . .
CMD [ "node", "server.js" ]
