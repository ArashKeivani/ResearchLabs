FROM node:22-bookworm-slim
WORKDIR /srv
COPY server.js ./server.js
ENV HOST=0.0.0.0
ENV PORT=8081
USER node
EXPOSE 8081
CMD ["node", "server.js"]
