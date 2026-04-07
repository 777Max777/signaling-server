FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install --production

# Copy server code
COPY server.js ./

EXPOSE 4444

CMD ["node", "server.js"]
