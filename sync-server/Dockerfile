FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --production

# Copy server code
COPY server.js ./

EXPOSE 1234

CMD ["node", "server.js"]
