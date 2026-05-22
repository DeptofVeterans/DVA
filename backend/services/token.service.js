const jwt = require("jsonwebtoken");
const env = require("../config/env");

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.userId,
      roleCode: user.roleCode,
      accountType: user.accountType
    },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret);
}

module.exports = {
  signAccessToken,
  verifyAccessToken
};
