const ErrorHandler = require('../utils/ErrorHandler');

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // MySQL Duplicate Entry Error (e.g., duplicate email or duplicate order_number)
  if (err.code === 'ER_DUP_ENTRY') {
    const message = 'Duplicate entry detected. A record with these details already exists.';
    err = new ErrorHandler(message, 409);
  }

  // MySQL Foreign Key Constraint Error (Referenced parent row does not exist)
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_NO_REFERENCED_ROW') {
    const message = 'Referenced record not found. Please verify associated IDs.';
    err = new ErrorHandler(message, 400);
  }

  // MySQL Foreign Key Constraint Error (Cannot delete or update because child row exists)
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
    const message = 'Cannot perform this action because other records depend on this item.';
    err = new ErrorHandler(message, 400);
  }

  // MySQL Connection / Network Errors
  if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ETIMEDOUT') {
    const message = 'Database server connection lost or refused. Please check database server availability.';
    err = new ErrorHandler(message, 503);
  }

  // MySQL Access Denied
  if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    const message = 'Database access denied. Please verify credentials or IP authorization in MySQL.';
    err = new ErrorHandler(message, 500);
  }

  // Invalid JWT Error
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid authorization token. Please log in again.';
    err = new ErrorHandler(message, 401);
  }

  // Expired JWT Error
  if (err.name === 'TokenExpiredError') {
    const message = 'Your session has expired. Please log in again.';
    err = new ErrorHandler(message, 401);
  }

  // In development, log the full stack trace
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] [${req.method} ${req.originalUrl}] Status: ${err.statusCode} - ${err.message}`);
    if (err.statusCode === 500 && err.stack) {
      console.error(err.stack);
    }
  }

  return res.status(err.statusCode).json({
    success: false,
    status: err.status || 'error',
    message: err.message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack, code: err.code } : {}),
  });
};