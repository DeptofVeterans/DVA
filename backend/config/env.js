const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function requireEnv(name, fallback) {
  const value = process.env[name] ?? fallback;

  if (value === undefined || value === null || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getOrigins(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 3000),
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:4200",
  corsAllowedOrigins: getOrigins(
    process.env.CORS_ALLOWED_ORIGINS || process.env.FRONTEND_URL || "http://localhost:4200"
  ),
  db: {
    host: requireEnv("DB_HOST", "localhost"),
    port: Number(process.env.DB_PORT || 3306),
    name: requireEnv("DB_NAME", "jdf_veterans_affairs_portal"),
    user: requireEnv("DB_USER", "root"),
    password: requireEnv("DB_PASSWORD", ""),
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    ssl: String(process.env.DB_SSL || "false") === "true",
    sslRejectUnauthorized: String(process.env.DB_SSL_REJECT_UNAUTHORIZED || "true") === "true"
  },
  jwt: {
    accessSecret: requireEnv("JWT_ACCESS_SECRET", "dev-access-secret"),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshSecret: requireEnv("JWT_REFRESH_SECRET", "dev-refresh-secret"),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d"
  },
  sessionSecret: requireEnv("SESSION_SECRET", "dev-session-secret"),
  lookupHashPepper: requireEnv("LOOKUP_HASH_PEPPER", "dev-pepper"),
  encryptionKey: requireEnv("DATA_ENCRYPTION_KEY", "ZGV2LWtleS1yZXBsYWNlLW1lLTMyeS1iYXNlNjQhISE="),
  encryptionKeyVersion: Number(process.env.DATA_ENCRYPTION_KEY_VERSION || 1),
  uploads: {
    rootDir: process.env.UPLOAD_DIR || "uploads",
    privateDir: process.env.PRIVATE_UPLOAD_DIR || "uploads/private",
    identityDir: process.env.IDENTITY_UPLOAD_DIR || "uploads/identity",
    requestDir: process.env.REQUEST_UPLOAD_DIR || "uploads/requests",
    profileDir: process.env.PROFILE_UPLOAD_DIR || "uploads/profiles",
    galleryDir: process.env.GALLERY_UPLOAD_DIR || "uploads/gallery",
    maxUploadSizeMb: Number(process.env.MAX_UPLOAD_SIZE_MB || 10)
  },
  allowStaffSelfSignup: String(process.env.ALLOW_STAFF_SELF_SIGNUP || "true") === "true",
  requireIdentityVerificationForIssuance:
    String(process.env.REQUIRE_IDENTITY_VERIFICATION_FOR_ISSUANCE || "true") === "true",
  mainAdminBootstrapKey: process.env.MAIN_ADMIN_BOOTSTRAP_KEY || "bootstrap-main-admin-local-only"
};
