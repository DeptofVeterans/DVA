const fs = require("fs");
const path = require("path");

const apiBaseUrl = process.env.API_BASE_URL || "http://localhost:3000/api";
const target = path.resolve(__dirname, "../src/environments/environment.prod.ts");

const content = `export const environment = {
  production: true,
  apiBaseUrl: ${JSON.stringify(apiBaseUrl)}
};
`;

fs.writeFileSync(target, content, "utf8");
console.log(`Angular production API URL set to ${apiBaseUrl}`);
