# Runs Stoora in a container:  docker build -t stoora .   then   docker run -p 3000:3000 --env-file .env -v stoora-data:/app/data stoora
FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY server ./server
COPY public ./public
ENV NODE_ENV=production PORT=3000 DB_PATH=/app/data/stoora.db
VOLUME /app/data
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3000/api/ready || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "server/index.js"]
