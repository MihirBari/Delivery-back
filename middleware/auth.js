const jwt = require('jsonwebtoken');
const ErrorHandler = require('../utils/ErrorHandler');
const catchAsync = require('../utils/catchAsync');

/**
 * Middleware to verify JWT authentication token from cookies or Authorization header
 */
const verifyToken = catchAsync(async (req, res, next) => {
  let token;

  // Check cookie first (as used by current UI)
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // Check Authorization Bearer header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ErrorHandler('Authentication required. Please log in to access this resource.', 401));
  }

  try {
    const secret = process.env.JWT_SECRET || 'jwt-secret-key';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    return next(new ErrorHandler('Invalid or expired authentication token. Please log in again.', 401));
  }
});

/**
 * Optional authentication middleware - attaches user if token present, but does not block if omitted
 */
const optionalAuth = (req, res, next) => {
  let token;
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (token) {
    try {
      const secret = process.env.JWT_SECRET || 'jwt-secret-key';
      req.user = jwt.verify(token, secret);
    } catch (err) {
      // Ignore token decode error in optional auth
    }
  }
  next();
};

module.exports = {
  verifyToken,
  optionalAuth,
};
