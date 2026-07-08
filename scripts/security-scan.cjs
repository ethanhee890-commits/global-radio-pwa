const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ignoredDirectories = new Set(['.git', 'dist', 'node_modules', 'coverage', '.vite']);
const findings = [];

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function walk(current) {
  const stat = fs.statSync(current);

  if (stat.isDirectory()) {
    if (ignoredDirectories.has(path.basename(current))) {
      return;
    }

    for (const child of fs.readdirSync(current)) {
      walk(path.join(current, child));
    }
    return;
  }

  const relativePath = path.relative(root, current).replace(/\\/g, '/');
  if (!/\.(cjs|js|json|md|ts|tsx|env|example|local|html|css|webmanifest|ya?ml)$/.test(relativePath)) {
    return;
  }

  const text = readText(current);

  if (
    /(^|\n)\s*(?:[A-Z0-9_]*(?:SECRET|TOKEN|API_KEY|PASSWORD)[A-Z0-9_]*)\s*=\s*(?!\s*(?:$|<|your_|example|replace_me))\S+/i.test(
      text
    ) &&
    !relativePath.endsWith('.example')
  ) {
    findings.push(`${relativePath}: possible secret assignment found.`);
  }

  if (relativePath !== 'scripts/security-scan.cjs' && /dangerouslySetInnerHTML|document\.write|new Function|eval\s*\(/.test(text)) {
    findings.push(`${relativePath}: dangerous browser execution pattern found.`);
  }
}

walk(root);

const gitignore = readText(path.join(root, '.gitignore'));
for (const requiredIgnore of ['.env.local', '.env.*.local', 'node_modules/', 'dist/']) {
  if (!gitignore.includes(requiredIgnore)) {
    findings.push(`.gitignore: missing ${requiredIgnore}`);
  }
}

const packageJson = JSON.parse(readText(path.join(root, 'package.json')) || '{}');
if (packageJson.scripts?.dev?.includes('0.0.0.0')) {
  findings.push('package.json: default dev script must not bind to 0.0.0.0. Use dev:lan only for mobile testing.');
}

const indexHtml = readText(path.join(root, 'index.html'));
for (const requiredPolicy of ['Content-Security-Policy', "object-src 'none'"]) {
  if (!indexHtml.includes(requiredPolicy)) {
    findings.push(`index.html: missing CSP policy segment ${requiredPolicy}.`);
  }
}

if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}

console.log('Security scan passed.');
