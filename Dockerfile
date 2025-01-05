FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application files
COPY server.js ./
COPY public/ ./public/

# Expose port for the main dashboard
EXPOSE 3000

CMD ["node", "server.js"]
