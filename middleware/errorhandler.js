/**
 * Global Error Handling Middleware
 */

export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.error('Error Stack:', err.stack);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    error.message = 'Resource not found';
    return res.status(404).json({ success: false, error: error.message });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    error.message = 'Duplicate field value entered';
    return res.status(400).json({ success: false, error: error.message });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    error.message = messages.join(', ');
    return res.status(400).json({ success: false, error: error.message });
  }

  // Axios errors (API calls)
  if (err.isAxiosError) {
    error.message = err.response?.data?.error || 'External API request failed';
    return res.status(err.response?.status || 500).json({ 
      success: false, 
      error: error.message 
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    error: error.message || 'Server Error'
  });
};