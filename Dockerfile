FROM node:24.12.0-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (deterministic)
COPY package*.json ./
RUN npm ci
RUN npm ci

# Prisma generate (so imports/types are available)
COPY prisma ./prisma/
RUN npx prisma generate

# Source code
COPY . .

EXPOSE 3000
CMD ["npm", "run", "start:docker"]
