const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const [, , envFileArg, command, ...args] = process.argv;

if (!envFileArg || !command) {
  console.error('Usage: node scripts/with-env.js <env-file> <command> [...args]');
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, '..');
const envPath = path.resolve(projectRoot, envFileArg);

if (!fs.existsSync(envPath)) {
  console.error(`Missing env file: ${path.relative(projectRoot, envPath)}`);
  process.exit(1);
}

const env = {
  ...process.env,
  ...readEnvFile(envPath),
};

if (!env.NODE_ENV && envFileArg.includes('production')) {
  env.NODE_ENV = 'production';
}

const result = spawnSync(command, args, {
  cwd: projectRoot,
  env,
  shell: true,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);

function readEnvFile(filePath) {
  const values = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const rawValue = trimmedLine.slice(separatorIndex + 1).trim();

    if (!key) {
      continue;
    }

    values[key] = unquote(rawValue);
  }

  return values;
}

function unquote(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
