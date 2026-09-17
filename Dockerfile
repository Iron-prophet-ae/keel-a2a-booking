FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY src ./src
COPY scripts ./scripts
COPY docs ./docs
COPY tsconfig.json ./

RUN mkdir -p artifacts .data

ENV HOST=0.0.0.0
ENV PORT=47821
ENV CALENDAR_PROVIDER=mock
ENV KEEL_A2A_KEY_FILE=/app/.data/keel-api-key

EXPOSE 47821

CMD ["npm", "start"]
