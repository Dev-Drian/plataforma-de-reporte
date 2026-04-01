FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
# Install all dependencies (including dev) for building
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN npm run build

EXPOSE 4000

CMD ["npm", "start"]

