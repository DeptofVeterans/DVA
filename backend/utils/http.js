function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function toBufferIp(ip) {
  if (!ip) {
    return null;
  }

  if (ip.startsWith("::ffff:")) {
    return ip.replace("::ffff:", "");
  }

  return ip;
}

module.exports = {
  asyncHandler,
  toBufferIp
};
