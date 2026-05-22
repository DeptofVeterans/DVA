const { pool } = require("../config/database");
const { verifyAccessToken } = require("../services/token.service");
const { loadUserById } = require("../services/user.service");

function resolveBearerToken(headerValue) {
  const header = String(headerValue || "");
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

async function loadAuthenticatedUser(token) {
  if (!token) {
    return null;
  }

  const decoded = verifyAccessToken(token);
  const connection = await pool.getConnection();

  try {
    const user = await loadUserById(connection, decoded.sub);
    return user && user.isActive ? user : null;
  } finally {
    connection.release();
  }
}

async function requireAuth(req, res, next) {
  const token = resolveBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const user = await loadAuthenticatedUser(token);

    if (!user) {
      return res.status(401).json({ message: "User account is inactive." });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

async function optionalAuth(req, _res, next) {
  const token = resolveBearerToken(req.headers.authorization);

  if (!token) {
    req.user = null;
    next();
    return;
  }

  try {
    req.user = await loadAuthenticatedUser(token);
  } catch (error) {
    req.user = null;
  }

  next();
}

module.exports = {
  requireAuth,
  optionalAuth
};
