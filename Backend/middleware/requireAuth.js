const authService = require('../services/authService');

const requireAuth = async (req, res, next) => {
  try {
    const authorization = req.get('authorization') || '';
    const [scheme, token] = authorization.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({
        success: false,
        message: 'Please log in',
      });
    }

    req.user = await authService.getUserForToken(token);
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = requireAuth;
