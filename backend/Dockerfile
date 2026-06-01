FROM node:22-alpine

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies and generate prisma client
RUN npm ci
RUN npx prisma generate

# Copy application code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# Expose API port
EXPOSE 4000

# Start server
CMD ["npm", "run", "start:prod"]
