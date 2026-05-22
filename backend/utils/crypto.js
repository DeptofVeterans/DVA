const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const env = require("../config/env");

function resolveEncryptionKey(rawValue) {
  const trimmed = String(rawValue || "").trim();

  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  return Buffer.from(trimmed, "base64");
}

const encryptionKey = resolveEncryptionKey(env.encryptionKey);

if (encryptionKey.length !== 32) {
  throw new Error("DATA_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
}

function normalizeLookup(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeRegimentalNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

function hmacLookup(value) {
  return crypto
    .createHmac("sha256", env.lookupHashPepper)
    .update(value)
    .digest();
}

function emailLookupHash(email) {
  return hmacLookup(normalizeLookup(email));
}

function regimentalLookupHash(regimentalNumber) {
  return hmacLookup(normalizeRegimentalNumber(regimentalNumber));
}

function encryptJson(payload) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return {
    ciphertext,
    iv,
    tag,
    keyVersion: env.encryptionKeyVersion
  };
}

function decryptJson(ciphertext, iv, tag) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return JSON.parse(plaintext);
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function encryptText(text) {
  return encryptJson({ value: text });
}

function decryptText(ciphertext, iv, tag) {
  const payload = decryptJson(ciphertext, iv, tag);
  return payload.value || "";
}

module.exports = {
  normalizeLookup,
  normalizeRegimentalNumber,
  emailLookupHash,
  regimentalLookupHash,
  encryptJson,
  decryptJson,
  encryptText,
  decryptText,
  hashPassword,
  comparePassword
};
