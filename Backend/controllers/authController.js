const authService = require('../services/authService');

const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body || {});
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body || {});
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

const getMe = (req, res) => res.status(200).json(req.user);

const updateMe = async (req, res, next) => {
  try {
    const user = await authService.updateUser(req.user.id, req.body || {});
    return res.status(200).json(user);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateMe,
};
