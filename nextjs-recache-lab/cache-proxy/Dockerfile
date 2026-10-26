FROM node:22-bookworm-slim
WORKDIR /srv
COPY server.js ./server.js
ENV LISTEN_HOST=0.0.0.0
ENV LISTEN_PORT=8080
CMD ["node", "server.js"]
