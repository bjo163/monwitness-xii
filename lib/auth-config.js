export const SESSION_DATA_CACHE_TTL_SECONDS = 60;

export function getNeonAuthConfig(env = process.env) {
  return {
    baseUrl: env.NEON_AUTH_BASE_URL,
    cookies: {
      secret: env.NEON_AUTH_COOKIE_SECRET,
      sessionDataTtl: SESSION_DATA_CACHE_TTL_SECONDS,
    },
    logLevel: "error",
  };
}
