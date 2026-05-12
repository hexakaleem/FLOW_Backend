FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY gateway/package.json gateway/
COPY monolith/package.json monolith/
COPY realtime/package.json realtime/

RUN npm install

COPY . .

RUN npm run build -w shared && \
    npm run build -w monolith && \
    npm run build -w gateway && \
    npm run build -w realtime

FROM node:20-alpine AS monolith
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 4000
CMD ["node", "monolith/dist/index.js"]

FROM node:20-alpine AS gateway
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 3000
CMD ["node", "gateway/dist/index.js"]

FROM node:20-alpine AS realtime
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 3005
CMD ["node", "realtime/dist/index.js"]
