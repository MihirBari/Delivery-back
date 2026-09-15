const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { promisePool } = require('../config/db');
const ErrorHandler = require('../utils/ErrorHandler');
const catchAsync = require('../utils/catchAsync');

/**
 * User Login Handler
 * @route POST /login
 */
const login = catchAsync(async (req, res, next) => {
  const { email, password, rememberMe } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler('Please provide both email and password', 400));
  }

  // Look up user by email
  const [users] = await promisePool.execute(
    'SELECT id, name, email, password, role FROM users WHERE email = ? LIMIT 1',
    [email.trim().toLowerCase()]
  );

  if (!users || users.length === 0) {
    return next(new ErrorHandler('Invalid email or password', 401));
  }

  const user = users[0];

  // Compare password hash
  const isMatch = await bcrypt.compare(password.toString(), user.password);
  if (!isMatch) {
    return next(new ErrorHandler('Invalid email or password', 401));
  }

  // Token lifetime
  const expiresIn = rememberMe ? '30d' : (process.env.JWT_EXPIRES_IN || '5d');
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 5 * 24 * 60 * 60 * 1000;

  // Sign JWT token
  const token = jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || 'jwt-secret-key',
    { expiresIn }
  );

  // Set HTTP-only cookie
  res.cookie('token', token, {
    httpOnly: true,
    maxAge,
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    secure: process.env.NODE_ENV === 'production',
  });

  // Maintain 100% compatibility with frontend expectation: res.data.data = user.id
  return res.status(200).json({
    Status: 'Success',
    success: true,
    data: user.id,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
  });
});

/**
 * User Logout Handler
 * @route GET /logout
 */
const logout = catchAsync(async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    secure: process.env.NODE_ENV === 'production',
  });

  return res.status(200).json({
    Status: 'Success',
    status: 'Success',
    message: 'Logged out successfully',
  });
});

/**
 * Get Current Logged In User
 * @route GET /me
 */
const getMe = catchAsync(async (req, res, next) => {
  if (!req.user || !req.user.id) {
    return next(new ErrorHandler('Not authenticated', 401));
  }

  const [users] = await promisePool.execute(
    'SELECT id, name, email, role, created_at FROM users WHERE id = ? LIMIT 1',
    [req.user.id]
  );

  if (!users || users.length === 0) {
    return next(new ErrorHandler('User not found', 404));
  }

  return res.status(200).json({
    success: true,
    data: users[0],
  });
});

module.exports = {
  login,
  logout,
  getMe,
};
