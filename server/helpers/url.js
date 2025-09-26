// helpers/url.js
function buildFileUrl(req, fileRoute) {
  const envBase = process.env.BACKEND_URL;
  if (envBase) return `${envBase}${fileRoute}`;

  // Fallback: derive from request (works for dev)
  return `${req.protocol}://${req.get('host')}${fileRoute}`;
}
module.exports = { buildFileUrl };
