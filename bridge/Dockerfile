FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY server.mjs ./

# Health check endpoint for Fly.io
EXPOSE 8080

CMD ["node", "server.mjs"]
