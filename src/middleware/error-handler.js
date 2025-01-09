// Error handling middleware
module.exports = (err, req, res, next) => {
    console.error('Error:', err);
    
    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.message
        });
    }

    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        return res.status(503).json({
            error: 'Database Error',
            details: 'A database error occurred'
        });
    }

    // Default error response
    res.status(500).json({
        error: 'Internal Server Error',
        details: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
};
