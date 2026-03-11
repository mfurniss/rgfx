import { app } from 'electron';
import log from 'electron-log/main';
import semver from 'semver';
import { GITHUB_RELEASES_API_URL } from '../config/constants';

/**
 * Compare two semver strings. Returns true if latest is newer than current.
 */
export function isNewerVersion(current: string, latest: string): boolean {
  const cur = semver.parse(semver.clean(current) ?? current);
  const lat = semver.parse(semver.clean(latest) ?? latest);

  if (!cur || !lat) {
    return false;
  }

  return semver.gt(lat, cur);
}

/**
 * Check GitHub releases for a newer version of the hub.
 * Returns the release URL if a newer version exists, null otherwise.
 * Silently returns null on any error.
 */
export async function checkForUpdate(
  currentVersion: string,
): Promise<string | null> {
  if (!app.isPackaged) {
    return null;
  }

  try {
    const response = await fetch(GITHUB_RELEASES_API_URL, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'rgfx-hub',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const data = await response.json() as { tag_name?: string; html_url?: string };
    const { tag_name: tagName, html_url: htmlUrl } = data;

    if (!tagName || !htmlUrl) {
      throw new Error('GitHub release response missing tag_name or html_url');
    }

    if (isNewerVersion(currentVersion, tagName)) {
      log.info(`Update available: current=${currentVersion}, latest=${tagName.replace(/^v/, '')}`);
      return htmlUrl;
    }
  } catch (error) {
    log.error('Failed to check for updates:', error);
  }

  return null;
}
