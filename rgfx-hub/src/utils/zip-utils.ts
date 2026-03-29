import { extname } from 'pathe';
import yauzl from 'yauzl';

/**
 * Returns the extension of the first non-directory file inside a zip archive,
 * or null if the zip cannot be read or contains no files.
 */
export function getZipInnerExtension(zipPath: string): Promise<string | null> {
  return new Promise((resolve) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        resolve(null);
        return;
      }

      zipfile.readEntry();

      zipfile.on('entry', (entry: yauzl.Entry) => {
        if (!entry.fileName.endsWith('/')) {
          zipfile.close();
          resolve(extname(entry.fileName).toLowerCase());
          return;
        }

        zipfile.readEntry();
      });

      zipfile.on('end', () => {
        resolve(null);
      });

      zipfile.on('error', () => {
        resolve(null);
      });
    });
  });
}
