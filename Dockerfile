FROM node:20 AS builder
WORKDIR /app

# Copy workspace config and package files
COPY package.json package-lock.json tsconfig.base.json ./
COPY shared/package.json shared/
COPY shared/tsconfig.json shared/
COPY gateway/package.json gateway/
COPY gateway/tsconfig.json gateway/
COPY monolith/package.json monolith/
COPY monolith/tsconfig.json monolith/
COPY realtime/package.json realtime/
COPY realtime/tsconfig.json realtime/

# Install all workspace dependencies
RUN npm install

# Copy source code
COPY shared/src shared/src/
COPY gateway/src gateway/src/
COPY monolith/src monolith/src/
COPY realtime/src realtime/src/

# Build all packages
RUN npm run build -w shared
RUN npm run build -w monolith
RUN npm run build -w gateway
RUN npm run build -w realtime

# --- Monolith ---
FROM node:20 AS monolith
WORKDIR /app
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/shared/package.json /app/shared/
COPY --from=builder /app/shared/dist /app/shared/dist
COPY --from=builder /app/monolith/package.json /app/monolith/
COPY --from=builder /app/monolith/dist /app/monolith/dist
COPY --from=builder /app/tsconfig.base.json /app/
EXPOSE 4000
CMD ["node", "monolith/dist/index.js"]

# --- Gateway ---
FROM node:20 AS gateway
WORKDIR /app
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/shared/package.json /app/shared/
COPY --from=builder /app/shared/dist /app/shared/dist
COPY --from=builder /app/gateway/package.json /app/gateway/
COPY --from=builder /app/gateway/dist /app/gateway/dist
EXPOSE 3000
CMD ["node", "gateway/dist/index.js"]

# --- Realtime ---
FROM node:20 AS realtime
WORKDIR /app
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/shared/package.json /app/shared/
COPY --from=builder /app/shared/dist /app/shared/dist
COPY --from=builder /app/realtime/package.json /app/realtime/
COPY --from=builder /app/realtime/dist /app/realtime/dist
EXPOSE 3005
CMD ["node", "realtime/dist/index.js"]