const jwt = require('jsonwebtoken');
const { error } = require('../common/response');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'Authorization header missing or invalid', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (err) {
    return error(res, 'Invalid or expired token', 401);
  }
};

// Decodes the bearer token if present but never rejects. Useful for endpoints
// that are public but want to personalize the response when a user is
// authenticated (e.g. GET /feed returning the user's own reaction type).
const optionalAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch (_) {
    // Ignore invalid/expired tokens for optional auth.
  }
  return next();
};

// Handles guest identity via X-Guest-Id header. Treats guests as "soft users"
// so reactions/views/shares are deduped per guest ID.
const guestAuthMiddleware = (req, res, next) => {
  const guestId = req.headers['x-guest-id'];
  
  if (guestId && typeof guestId === 'string' && guestId.length > 0) {
    // Validate guest ID format (UUID v4)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(guestId)) {
      req.guest = { id: guestId };
      req.user = null; // Explicitly set to null to distinguish from authenticated users
    }
  }
  
  next();
};

module.exports = authMiddleware;
module.exports.optionalAuth = optionalAuthMiddleware;
module.exports.guestAuth = guestAuthMiddleware;
