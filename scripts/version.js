const fs = require('fs');
const path = require('path');

const releaseType = process.argv[2];
const supportedReleaseTypes = new Set(['major', 'minor', 'patch']);
const projectRoot = path.resolve(__dirname, '..');
const versionPath = path.join(projectRoot, 'version.json');
const packagePath = path.join(projectRoot, 'package.json');
const packageLockPath = path.join(projectRoot, 'package-lock.json');
const appConfigPath = path.join(projectRoot, 'app.json');

if (!supportedReleaseTypes.has(releaseType)) {
  console.error('Usage: node scripts/version.js <patch|minor|major>');
  process.exit(1);
}

const version = readJson(versionPath);
const nextVersionName = incrementVersionName(version.versionName, releaseType);
const nextVersionCode = Number(version.versionCode) + 1;

writeJson(versionPath, {
  versionCode: nextVersionCode,
  versionName: nextVersionName,
});

const packageJson = readJson(packagePath);
packageJson.version = nextVersionName;
writeJson(packagePath, packageJson);

if (fs.existsSync(packageLockPath)) {
  const packageLockJson = readJson(packageLockPath);
  packageLockJson.version = nextVersionName;

  if (packageLockJson.packages?.['']) {
    packageLockJson.packages[''].version = nextVersionName;
  }

  writeJson(packageLockPath, packageLockJson);
}

const appConfig = readJson(appConfigPath);
appConfig.expo.version = nextVersionName;
writeJson(appConfigPath, appConfig);

console.log(`Chess Elite version updated to ${nextVersionName} (${nextVersionCode})`);

function incrementVersionName(versionName, type) {
  if (typeof versionName !== 'string' || !/^\d+\.\d+\.\d+$/.test(versionName)) {
    throw new Error(`Invalid versionName: ${versionName}`);
  }

  const [major, minor, patch] = versionName.split('.').map(Number);

  if (type === 'major') {
    return `${major + 1}.0.0`;
  }

  if (type === 'minor') {
    return `${major}.${minor + 1}.0`;
  }

  return `${major}.${minor}.${patch + 1}`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}
