# Optional — only needed for hosts that want a container (Fly.io, Railway, Cloud Run).
# Render and most Node hosts can run this repo directly with `npm start`.
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
