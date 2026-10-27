const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Administrator access is required',
    });
  }
  return next();
};

module.exports = requireAdmin;
