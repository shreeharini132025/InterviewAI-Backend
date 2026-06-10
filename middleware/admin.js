const auth = require('./auth');

module.exports = (req, res, next) => {
  auth(req, res, () => {
    if (req.user && req.user.role === 'admin') return next();
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  });
};
