declare module "bun" {
  export interface Env {
    poe_client_id?: string;
    poe_client_secret?: string;

    MPT_DB_URL?: string;
    MPT_DB_HOST: string;
    MPT_DB_USER: string;
    MPT_DB_PASS: string;
    MPT_DB_NAME: string;

    SCRAPPER_DB_URL?: string;
    SCRAPPER_DB_HOST: string;
    SCRAPPER_DB_USER: string;
    SCRAPPER_DB_PASS: string;
    SCRAPPER_DB_NAME: string;
  }
}
