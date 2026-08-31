export function errorHandler(error, req, res, next) {
    console.error(error);
    res.status(error.name === 'ValidationError' ? 400 : 500).json({ message: error.message || 'Internal server error' });
}
