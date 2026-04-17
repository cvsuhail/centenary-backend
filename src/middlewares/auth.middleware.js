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

module.exports = authMiddleware;
module.exports.optionalAuth = optionalAuthMiddleware;
