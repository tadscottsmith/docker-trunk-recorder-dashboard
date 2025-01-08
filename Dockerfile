FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies in development)
RUN if [ "$NODE_ENV" = "production" ]; then \
        npm ci --only=production; \
    else \
        npm install; \
    fi

# Copy application files
COPY src/ ./src/
COPY public/ ./public/

# Create data directory
RUN mkdir -p data/talkgroups

# Expose port for the main dashboard
EXPOSE 3000

# Use nodemon in development, node in production
CMD if [ "$NODE_ENV" = "production" ]; then \
        node src/server.js; \
    else \
        npm run dev; \
    fi
