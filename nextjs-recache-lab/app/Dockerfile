FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json ./
RUN npm install --no-audit --no-fund

COPY . ./
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=build /app ./
EXPOSE 3000
CMD ["npm", "run", "start"]
