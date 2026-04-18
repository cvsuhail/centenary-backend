const jwt = require('jsonwebtoken');
const { error } = require('../common/response');

// The mobile app generates a UUID on first launch and keeps it in secure
// storage; every request made without a bearer token carries it as
// `X-Guest-Id`. We validate the shape (printable ASCII, bounded length)
// so badly-behaved clients can't inject multi-MB blobs or null bytes
// into the downstream DB layer.
const GUEST_ID_RE = /^[a-zA-Z0-9_-]{8,64}$/;
const extractGuestId = (req) => {
  const raw = req.headers['x-guest-id'];
  if (!raw || typeof raw !== 'string') return null;
  return GUEST_ID_RE.test(raw) ? raw : null;
};

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'Authorization header missing or invalid', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    req.guestId = extractGuestId(req);
    next();
  } catch (err) {
    return error(res, 'Invalid or expired token', 401);
  }
};

// Decodes the bearer token if present but never rejects. Useful for endpoints
// that are public but want to personalize the response when a user is
// authenticated (e.g. GET /feed returning the user's own reaction type).
const optionalAuthMiddleware = (req, res, next) => {
  req.guestId = extractGuestId(req);
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

module.exports = authMiddleware;
module.exports.optionalAuth = optionalAuthMiddleware;
module.exports.extractGuestId = extractGuestId;
