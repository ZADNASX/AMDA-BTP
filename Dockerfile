# Image de production du site AMDA BTP.
# Node 24 : « node:sqlite » y est intégré, aucune dépendance native à compiler.
FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

# Les dépendances d'abord : cette couche n'est reconstruite que si package.json change.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY site ./site

# Base de données et pièces jointes : à monter sur un disque persistant,
# sinon chaque redéploiement repart d'une base vide.
ENV DATA_DIR=/data
RUN mkdir -p /data && chown -R node:node /data
VOLUME /data

USER node
EXPOSE 4321
CMD ["node", "server/app.js"]
