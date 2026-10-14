const ApiError = require('../utils/apiError');

const errorHandler = (err, req, res, next) => {
  let error = err;

  // If error is not an instance of ApiError, convert it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
    let message = error.message || 'Internal Server Error';
    let errors = [];

    // Mongoose Validation Error
    if (error.name === 'ValidationError') {
      message = 'Validation Error';
      errors = Object.values(error.errors).map((el) => ({
        field: el.path,
        message: el.message,
      }));
    }

    // Mongoose Duplicate Key Error (E11000)
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0] || 'field';
      message = `Duplicate value for ${field}. It must be unique.`;
      errors = [{ field, message }];
    }

    // Mongoose CastError (invalid ObjectId)
    if (error.name === 'CastError') {
      message = `Invalid resource ID: ${error.value}`;
    }

    error = new ApiError(statusCode, message, errors, err.stack);
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    errors: error.errors || [],
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  };

  return res.status(error.statusCode).json(response);
};

const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
