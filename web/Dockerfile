FROM node:18-alpine AS deps
WORKDIR /usr/src/app

RUN apk add --no-cache git

COPY package*.json ./
COPY libs ./libs

RUN npm ci --no-audit --no-fund

COPY . .

ARG REACT_APP_ADVANCED_SEARCH
ENV REACT_APP_ADVANCED_SEARCH=$REACT_APP_ADVANCED_SEARCH
RUN npm run build

FROM node:24-alpine AS release
WORKDIR /usr/src/app

# setupProxy.js's runtime deps, exact versions from the runtime lockfile.
COPY docker/runtime/package.json docker/runtime/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY --from=deps /usr/src/app/dist ./dist
COPY setupProxy.js ./
COPY docker/entrypoint.sh ./entrypoint.sh

RUN chmod +x ./entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
