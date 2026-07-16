// CORS for the mobile-consumed API. Mobile auth is bearer-based (no cookies), so a
// permissive origin is safe here; the cookie-authenticated web pages stay
// same-origin and must NOT use Allow-Credentials with a wildcard origin.
export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};
