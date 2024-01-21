import { PrismaClient as MptPrismaClient } from "../generated/client-mpt";
import { PrismaClient as ScrapperPrismaClient } from "../generated/client-scrapper";

const {
  MPT_DB_URL,
  MPT_DB_NAME,
  MPT_DB_USER,
  MPT_DB_PASS,
  MPT_DB_HOST,
  SCRAPPER_DB_URL,
  SCRAPPER_DB_NAME,
  SCRAPPER_DB_HOST,
  SCRAPPER_DB_PASS,
  SCRAPPER_DB_USER,
} = process.env;

export const mptPrisma = new MptPrismaClient({
  datasources: {
    db: {
      url:
        MPT_DB_URL ??
        `mysql://${MPT_DB_USER}:${MPT_DB_PASS}@${MPT_DB_HOST}:3306/${MPT_DB_NAME}`,
    },
  },
});
export const scrapperPrisma = new ScrapperPrismaClient({
  datasources: {
    db: {
      url:
        SCRAPPER_DB_URL ??
        `mysql://${SCRAPPER_DB_USER}:${SCRAPPER_DB_PASS}@${SCRAPPER_DB_HOST}:3306/${SCRAPPER_DB_NAME}`,
    },
  },
});
