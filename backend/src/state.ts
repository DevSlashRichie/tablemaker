
export type Bindings = {
  DB: D1Database;
  BUCKET: R2Bucket;
  JWT_SECRET: string;
  ADMIN_PASSWORD?: string;
  TURNSTILE_SECRET_KEY: string;
  EMAIL_API_KEY: string;
  EMAIL_FROM: string;
};
