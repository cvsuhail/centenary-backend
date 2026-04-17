const { error } = require('../common/response');

const errorMiddleware = (err, req, res, next) => {
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return error(res, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : null);
};

module.exports = errorMiddleware;
