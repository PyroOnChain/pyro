FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && npm install tsx typescript
COPY tsconfig.json ./
COPY src ./src
# CLUB_FACTORY, KEEPER_PRIVATE_KEY, RPC_URL, POLL_SECONDS, MIN_CLAIMABLE come from the environment.
CMD ["npx", "tsx", "src/index.ts"]
