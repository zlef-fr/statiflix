FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY server.js ./
COPY lib ./lib
COPY public ./public
# data/ is a mounted volume (relay store + tmdb cache)
CMD ["node", "server.js"]
