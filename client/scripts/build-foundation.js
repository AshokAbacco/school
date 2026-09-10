// client/scripts/build-foundation.js

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.resolve(__dirname, "..");

const FOUNDATION_CONFIGS = {
  waseela: {
    universityId: "4da2c3ac-8c4f-48c4-9aaf-8c6d2097d08e",
    foundationName: "Waseela Education Foundation",
    appName: "WASEELA EMS",
    address:
      "KVS Nagar, NTR Marg, Old  Town, Bukkaraya Samudram, Anantapur-515005",
    Phone: "+91 9502333436, +91 9030499487",
    appId: "com.waseela.edu",
    logo: "waseela.png",
  },

  fazeelah: {
    universityId: "8091e896-e32e-4b08-ab44-e7688a770658",
    foundationName: "Fazeelah EDU Society",
    appName: "FAZEELAH EMS",
    address: "Bathalpalli Road,Nagalur village, Dharmavaram-515672",
    Phone: "+91 7075355455, +91 7207744544",
    appId: "com.fazeelah.edu",
    logo: "fazeelah.png",
  },

  abacco: {
    universityId: "9af91d1c-e16f-4034-ab5d-daa7b0fbcb1f",
    foundationName: "Abacco Education Foundation",
    appName: "ABACCO One",
    address:
      "No 12,13 & 12/A, Kirthan Arcade, 3rd Floor, Aditya Nagar, Sandeep Unnikrishnan Road, Bangalore — 560097",
    Phone: "+91 7204986825, +91 9972452044",
    appId: "com.abacco.edu",
    logo: "abacco.png",
  },
};

const foundation = process.argv[2];

if (!foundation || !FOUNDATION_CONFIGS[foundation]) {
  console.error("");
  console.error("❌ Please specify a valid foundation:");
  console.error("");
  console.error("   npm run build:waseela");
  console.error("   npm run build:fazeelah");
  console.error("   npm run build:abacco");
  console.error("");
  process.exit(1);
}

const config = FOUNDATION_CONFIGS[foundation];

console.log("");
console.log("========================================");
console.log(` Building ${config.appName}`);
console.log("========================================");
console.log("");
console.log(`Foundation : ${config.foundationName}`);
console.log(`University : ${config.universityId}`);
console.log(`App ID     : ${config.appId}`);
console.log(`App Name   : ${config.appName}`);
console.log("");

/* -------------------------------------------------------
   1. Update schoolConfig.js
------------------------------------------------------- */

const schoolConfigPath = path.join(
  clientDir,
  "src",
  "config",
  "schoolConfig.js",
);

const schoolConfigContent = `// client/src/config/schoolConfig.js

const schoolConfig = {
  universityId: "${config.universityId}",
  foundationName: "${config.foundationName}",
  appName: "${config.appName}",
  foundationKey: "${foundation}",
  address: "${config.address}",
  Phone: "${config.Phone}",
};

export default schoolConfig;
`;

fs.writeFileSync(schoolConfigPath, schoolConfigContent);

console.log("✅ schoolConfig.js updated");

/* -------------------------------------------------------
   2. Update capacitor.config.js
------------------------------------------------------- */

const capacitorConfigPath = path.join(clientDir, "capacitor.config.json");

const capacitorConfigContent = JSON.stringify(
  {
    appId: config.appId,
    appName: config.appName,
    webDir: "dist",
    server: {
      androidScheme: "https",
    },
  },
  null,
  2,
);

fs.writeFileSync(capacitorConfigPath, capacitorConfigContent);
console.log("✅ capacitor.config.json updated");

/* -------------------------------------------------------
   3. Update Android build.gradle
------------------------------------------------------- */

const buildGradlePath = path.join(clientDir, "android", "app", "build.gradle");

let buildGradle = fs.readFileSync(buildGradlePath, "utf8");

buildGradle = buildGradle.replace(
  /applicationId\s+["'][^"']+["']/,
  `applicationId "${config.appId}"`,
);

fs.writeFileSync(buildGradlePath, buildGradle);

console.log("✅ Android applicationId updated");

/* -------------------------------------------------------
   4. Update Android strings.xml
------------------------------------------------------- */

const stringsPath = path.join(
  clientDir,
  "android",
  "app",
  "src",
  "main",
  "res",
  "values",
  "strings.xml",
);

const stringsContent = `<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="app_name">${config.appName}</string>
    <string name="title_activity_main">${config.appName}</string>
    <string name="package_name">${config.appId}</string>
    <string name="custom_url_scheme">${config.appId}</string>
</resources>
`;

fs.writeFileSync(stringsPath, stringsContent);

console.log("✅ Android strings.xml updated");

/* -------------------------------------------------------
   5. Copy selected logo
------------------------------------------------------- */

const resourcesDir = path.join(clientDir, "resources");
const sourceLogo = path.join(resourcesDir, config.logo);
const activeLogo = path.join(resourcesDir, "icon.png");

if (!fs.existsSync(sourceLogo)) {
  console.error("");
  console.error(`❌ Logo not found: ${sourceLogo}`);
  console.error("");
  console.error("Expected:");
  console.error("client/resources/waseela.png");
  console.error("client/resources/fazeelah.png");
  console.error("client/resources/abacco.png");
  console.error("");
  process.exit(1);
}

fs.copyFileSync(sourceLogo, activeLogo);

console.log(`✅ ${foundation} logo selected`);

/* -------------------------------------------------------
   6. Build web application
------------------------------------------------------- */

console.log("");
console.log("📦 Building web application...");
console.log("");

execSync("npm run build", {
  cwd: clientDir,
  stdio: "inherit",
});

/* -------------------------------------------------------
   7. Generate Android assets
------------------------------------------------------- */

console.log("");
console.log("🎨 Generating Android icons...");
console.log("");

execSync("npx capacitor-assets generate --android", {
  cwd: clientDir,
  stdio: "inherit",
});

/* -------------------------------------------------------
   8. Capacitor sync
------------------------------------------------------- */

console.log("");
console.log("🔄 Syncing Capacitor...");
console.log("");

execSync("npx cap sync android", {
  cwd: clientDir,
  stdio: "inherit",
});

/* -------------------------------------------------------
   Finished
------------------------------------------------------- */

console.log("");
console.log("========================================");
console.log(` ✅ ${config.appName} is ready`);
console.log("========================================");
console.log("");
console.log(`App ID     : ${config.appId}`);
console.log(`App Name   : ${config.appName}`);
console.log(`Foundation : ${config.foundationName}`);
console.log("");
