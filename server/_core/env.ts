export const ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
};
