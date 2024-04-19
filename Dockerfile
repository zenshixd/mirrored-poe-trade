FROM oven/bun:1.0.14-slim

COPY package.json drizzle.config.ts bunfig.toml bun.lockb src/updater.js src/scrapper.js src/api.js ./
COPY migrations/ ./migrations/
COPY src/db/schema.ts ./src/db/schema.ts

CMD ["bun", "run", "updater.js"]

EXPOSE 4000
