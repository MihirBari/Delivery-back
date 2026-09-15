/**
 * Wrapper for async Express route handlers to catch and forward rejections to next()
 * @param {Function} fn - Async express route handler function (req, res, next)
 * @returns {Function} Express middleware function
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = catchAsync;
