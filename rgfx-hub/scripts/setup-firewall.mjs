/**
 * Adds a Windows Firewall rule for the dev Electron binary.
 * Skipped on non-Windows platforms. Silently continues if not running as admin.
 */
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

if (process.platform !== 'win32') {
  process.exit(0);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const electronExe = resolve(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe');

if (!existsSync(electronExe)) {
  console.log('Electron binary not found, skipping firewall setup');
  process.exit(0);
}

const ruleName = 'RGFX Hub (Dev)';

try {
  // Remove existing rule first (ignore errors if it doesn't exist)
  try {
    execSync(`netsh advfirewall firewall delete rule name="${ruleName}"`, { stdio: 'ignore' });
  } catch { /* rule didn't exist */ }

  execSync(
    `netsh advfirewall firewall add rule name="${ruleName}" dir=in action=allow program="${electronExe}" enable=yes`,
    { stdio: 'pipe' }
  );
  console.log(`Firewall rule "${ruleName}" added for ${electronExe}`);
} catch {
  console.log('Could not add firewall rule (requires admin). Run once as admin:');
  console.log(`  netsh advfirewall firewall add rule name="${ruleName}" dir=in action=allow program="${electronExe}" enable=yes`);
}
