const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const ignoredDirectories = new Set([
  '.git',
  '.gradle-user-home',
  '.tools',
  '.playwright-cli',
  'android',
  'assets',
  'dist',
  'ios',
  'node_modules',
  'output',
  'test-results'
]);
const findings = [];
const runtimeFilePattern = /\.(cjs|js|json|ts|tsx|html|css|webmanifest)$/;

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
  if (!/\.(cjs|js|json|md|ps1|ts|tsx|env|example|local|html|css)$/.test(relativePath)) {
    return;
  }

  const text = readText(current);

  if (/(^|\n)NAVER_CLIENT_SECRET\s*=\s*(?!\s*(?:$|your_|네이버_|<))\S+/.test(text) && !['.env.local', '.env.example'].includes(relativePath)) {
    findings.push(`${relativePath}: NAVER_CLIENT_SECRET value must not be assigned outside local env files.`);
  }

  if (relativePath !== 'scripts/security-scan.cjs' && /dangerouslySetInnerHTML|document\.write|new Function|eval\s*\(/.test(text)) {
    findings.push(`${relativePath}: dangerous browser execution pattern found.`);
  }
}

walk(root);

function walkRuntimeFiles(current, visitor) {
  if (!fs.existsSync(current)) {
    return;
  }

  const stat = fs.statSync(current);
  if (stat.isDirectory()) {
    if (['.git', 'node_modules', 'coverage', '.vite'].includes(path.basename(current))) {
      return;
    }

    for (const child of fs.readdirSync(current)) {
      walkRuntimeFiles(path.join(current, child), visitor);
    }
    return;
  }

  const relativePath = path.relative(root, current).replace(/\\/g, '/');
  if (runtimeFilePattern.test(relativePath)) {
    visitor(current, relativePath, readText(current));
  }
}

function assertRuntimePolicy(_filePath, relativePath, text) {
  if (relativePath === 'scripts/security-scan.cjs' || relativePath.startsWith('src/test/')) {
    return;
  }

  if (/(?:yt-dlp|youtube-dl|ytdl-core|\bytdl\b|youtube\s+audio\s+extraction|audio\s+extraction)/i.test(text)) {
    findings.push(`${relativePath}: forbidden YouTube extraction/tooling pattern found in runtime code or asset.`);
  }

  if (/(?:src|href)=["']\/(?:icons\/|manifest\.webmanifest)/.test(text)) {
    findings.push(`${relativePath}: public assets must not be referenced from the domain root.`);
  }

  if (/"(?:src|start_url|scope)"\s*:\s*"\/(?:icons\/|manifest\.webmanifest)?/.test(text)) {
    findings.push(`${relativePath}: PWA manifest paths must be relative, not root-relative.`);
  }

  if (relativePath.endsWith('.css') && text.includes('.youtube-frame')) {
    if (/\.youtube-frame\s*\{[^}]*display\s*:\s*none/i.test(text)) {
      findings.push(`${relativePath}: YouTube iframe must never be hidden with display:none.`);
    }
    if (/\.youtube-frame\s*\{[^}]*(?:visibility\s*:\s*hidden|opacity\s*:\s*0|width\s*:\s*1px|height\s*:\s*1px)/i.test(text)) {
      findings.push(`${relativePath}: YouTube iframe must stay visibly sized and visible.`);
    }
    if (!/\.youtube-frame\s*\{[^}]*display\s*:\s*block/i.test(text) || !/\.youtube-frame\s*\{[^}]*width\s*:\s*100%/i.test(text)) {
      findings.push(`${relativePath}: YouTube iframe must explicitly render as a visible full-width frame.`);
    }
  }
}

function assertRelativeManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) {
    return;
  }

  const relativePath = path.relative(root, manifestPath).replace(/\\/g, '/');
  let manifest;
  try {
    manifest = JSON.parse(readText(manifestPath));
  } catch {
    findings.push(`${relativePath}: manifest must be valid JSON.`);
    return;
  }

  for (const key of ['start_url', 'scope']) {
    if (typeof manifest[key] === 'string' && manifest[key].startsWith('/')) {
      findings.push(`${relativePath}: ${key} must be relative for GitHub Pages/PWA subpath installs.`);
    }
  }

  for (const icon of Array.isArray(manifest.icons) ? manifest.icons : []) {
    if (typeof icon?.src === 'string' && icon.src.startsWith('/')) {
      findings.push(`${relativePath}: icon src must be relative for GitHub Pages/PWA subpath installs.`);
    }
  }
}

for (const runtimeRoot of ['src', 'public', 'public-radio', 'scripts', 'dist', 'android/app/src/main/assets/public']) {
  walkRuntimeFiles(path.join(root, runtimeRoot), assertRuntimePolicy);
}
assertRelativeManifest(path.join(root, 'public', 'manifest.webmanifest'));
assertRelativeManifest(path.join(root, 'public-radio', 'manifest.webmanifest'));
assertRelativeManifest(path.join(root, 'dist', 'manifest.webmanifest'));

const gitignore = readText(path.join(root, '.gitignore'));
for (const requiredIgnore of ['.env.local', '.env.*.local', 'node_modules/', 'dist/']) {
  if (!gitignore.includes(requiredIgnore)) {
    findings.push(`.gitignore: missing ${requiredIgnore}`);
  }
}

const packageJson = JSON.parse(readText(path.join(root, 'package.json')) || '{}');
if (packageJson.name !== 'global-radio-pwa') {
  findings.push('package.json: package name must match the release app identity.');
}
if (packageJson.private !== true) {
  findings.push('package.json: private must be true to prevent accidental npm publishing.');
}
if (packageJson.scripts?.dev?.includes('0.0.0.0')) {
  findings.push('package.json: default dev script must not bind to 0.0.0.0. Use dev:lan only for mobile testing.');
}

const viteConfig = readText(path.join(root, 'vite.config.ts'));
if (!viteConfig.includes("publicDir: 'public-radio'")) {
  findings.push('vite.config.ts: release build must use public-radio to avoid packaging unrelated legacy public assets.');
}

const capacitorConfig = readText(path.join(root, 'capacitor.config.ts'));
if (!capacitorConfig.includes("appId: 'com.dexcompany.globalradio'")) {
  findings.push('capacitor.config.ts: native appId must remain stable for Android/iOS packaging.');
}
if (!capacitorConfig.includes("webDir: 'dist'")) {
  findings.push('capacitor.config.ts: Capacitor webDir must point at the production dist build.');
}
if (!capacitorConfig.includes("loggingBehavior: 'none'")) {
  findings.push('capacitor.config.ts: native release logging must be disabled.');
}
if (!capacitorConfig.includes('cleartext: true')) {
  findings.push('capacitor.config.ts: cleartext must be explicit because public radio HTTP streams are a deliberate product exception.');
}
if (!capacitorConfig.includes("'@capacitor/local-notifications'")) {
  findings.push('capacitor.config.ts: Local Notifications plugin must be included for packaged radio alarms.');
}

const proxy = readText(path.join(root, 'server', 'naver-place-proxy.cjs'));
if (!proxy.includes("process.env.NAVER_PLACE_PROXY_HOST || '127.0.0.1'")) {
  findings.push('server/naver-place-proxy.cjs: proxy must default to 127.0.0.1.');
}

const indexHtml = readText(path.join(root, 'index.html'));
for (const requiredPolicy of [
  'Content-Security-Policy',
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'none'",
  "connect-src 'self' https://*.api.radio-browser.info https://all.api.radio-browser.info",
  "frame-src https://www.youtube.com https://www.youtube-nocookie.com"
]) {
  if (!indexHtml.includes(requiredPolicy)) {
    findings.push(`index.html: missing CSP policy segment ${requiredPolicy}.`);
  }
}

if (/connect-src[^"]*(?:localhost|127\.0\.0\.1|ws:\/\/)/.test(indexHtml)) {
  findings.push('index.html: release CSP connect-src must not include local dev hosts.');
}
if (indexHtml.includes('frame-ancestors')) {
  findings.push('index.html: frame-ancestors must be delivered as an HTTP header, not a meta CSP directive.');
}

const youtubePlayer = readText(path.join(root, 'src', 'components', 'YouTubeAlternatePlayer.tsx'));
if (/clipboard-write|web-share/.test(youtubePlayer)) {
  findings.push('src/components/YouTubeAlternatePlayer.tsx: iframe allow list must not include clipboard-write or web-share.');
}
if (!youtubePlayer.includes('referrerPolicy="strict-origin-when-cross-origin"')) {
  findings.push('src/components/YouTubeAlternatePlayer.tsx: iframe must set a strict referrer policy.');
}

const radioBrowser = readText(path.join(root, 'src', 'lib', 'radioBrowser.ts'));
const globalRadioStorage = readText(path.join(root, 'src', 'lib', 'globalRadioStorage.ts'));
if (!radioBrowser.includes('getSafeNetworkUrl') || !globalRadioStorage.includes('getSafeNetworkUrl')) {
  findings.push('radio URL ingestion and persisted station loading must pass through getSafeNetworkUrl.');
}
if (!radioBrowser.includes('getSafeHttpsUrl(item.favicon)') || !globalRadioStorage.includes('getSafeHttpsUrl')) {
  findings.push('radio favicon URLs must be HTTPS-only to match the release img-src policy.');
}

const androidManifest = readText(path.join(root, 'android', 'app', 'src', 'main', 'AndroidManifest.xml'));
const androidNetworkSecurity = readText(path.join(root, 'android', 'app', 'src', 'main', 'res', 'xml', 'network_security_config.xml'));
const androidFilePaths = readText(path.join(root, 'android', 'app', 'src', 'main', 'res', 'xml', 'file_paths.xml'));
if (androidManifest) {
  if (!androidManifest.includes('android:usesCleartextTraffic="true"')) {
    findings.push('android/app/src/main/AndroidManifest.xml: Android must explicitly allow HTTP radio streams.');
  }
  if (!androidManifest.includes('android:networkSecurityConfig="@xml/network_security_config"')) {
    findings.push('android/app/src/main/AndroidManifest.xml: Android network security config must be attached.');
  }
  if (!androidNetworkSecurity.includes('cleartextTrafficPermitted="true"')) {
    findings.push('android/app/src/main/res/xml/network_security_config.xml: cleartext radio stream exception is missing.');
  }
  for (const requiredAndroidNativeItem of [
    'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
    'android.permission.SCHEDULE_EXACT_ALARM',
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.RECEIVE_BOOT_COMPLETED',
    'NativeRadioService',
    'NativeRadioAlarmReceiver',
    'NativeRadioBootReceiver',
    'android:foregroundServiceType="mediaPlayback"'
  ]) {
    if (!androidManifest.includes(requiredAndroidNativeItem)) {
      findings.push(`android/app/src/main/AndroidManifest.xml: missing native radio item ${requiredAndroidNativeItem}.`);
    }
  }
}
if (androidFilePaths && /<external-path\b[^>]*path="\.?"/.test(androidFilePaths)) {
  findings.push('android/app/src/main/res/xml/file_paths.xml: FileProvider must not expose the whole external storage root.');
}

const nativeRadioPlugin = readText(path.join(root, 'android', 'app', 'src', 'main', 'java', 'com', 'dexcompany', 'globalradio', 'NativeRadioPlugin.java'));
if (nativeRadioPlugin) {
  for (const requiredNativeRadioCheck of ['startsWith("https://") || url.startsWith("http://")', 'scheduleAlarm', 'openExactAlarmSettings']) {
    if (!nativeRadioPlugin.includes(requiredNativeRadioCheck)) {
      findings.push(`NativeRadioPlugin.java: missing safety or alarm check ${requiredNativeRadioCheck}.`);
    }
  }
}

const iosInfoPlist = readText(path.join(root, 'ios', 'App', 'App', 'Info.plist'));
if (iosInfoPlist) {
  for (const atsKey of ['NSAllowsArbitraryLoadsForMedia', 'NSAllowsArbitraryLoadsInWebContent']) {
    if (!iosInfoPlist.includes(atsKey)) {
      findings.push(`ios/App/App/Info.plist: missing ATS media/web exception ${atsKey}.`);
    }
  }
  if (!iosInfoPlist.includes('<string>audio</string>')) {
    findings.push('ios/App/App/Info.plist: missing UIBackgroundModes audio entry.');
  }
}

const iosAppDelegate = readText(path.join(root, 'ios', 'App', 'App', 'AppDelegate.swift'));
if (iosAppDelegate && !iosAppDelegate.includes('AVAudioSession.sharedInstance().setCategory(.playback')) {
  findings.push('ios/App/App/AppDelegate.swift: missing playback AVAudioSession configuration.');
}

const nativeRadioHelper = readText(path.join(root, 'src', 'lib', 'nativeRadio.ts'));
if (!nativeRadioHelper.includes('canUseNativeRadioPlayback') || !nativeRadioHelper.includes('ensureNotificationPermission')) {
  findings.push('src/lib/nativeRadio.ts: native playback and notification permission helpers are required.');
}

const globalRadioApp = readText(path.join(root, 'src', 'GlobalRadioApp.tsx'));
if (!globalRadioApp.includes('className="persistent-audio"')) {
  findings.push('src/GlobalRadioApp.tsx: persistent audio element must remain mounted across tabs.');
}

if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exit(1);
}

console.log('Security scan passed.');
