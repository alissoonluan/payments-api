FROM node:20-slim

RUN apt-get update && apt-get install -y openssl netcat-traditional && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

EXPOSE 3000
CMD ["npm", "run", "start:dev"]
