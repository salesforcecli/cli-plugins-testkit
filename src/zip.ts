/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as JSZip from 'jszip';
import Debug from 'debug';

export interface ZipDirConfig {
  /**
   * The directory to zip.
   */
  sourceDir: string;

  /**
   * Zip will be written to this directory.
   */
  destDir: string;

  /**
   * The name of the zip file to create including extension.
   * E.g., "myArchivedDir.zip"
   */
  name: string;
}

/**
 * Zip the contents of a directory to a file.
 *
 * @param config what and where to zip
 * @returns The created zip file path
 */
export const zipDir = async (config: ZipDirConfig): Promise<string> => {
  const debug = Debug('testkit:zipDir');
  const { sourceDir, destDir, name } = config;
  const zipFilePath = path.join(destDir, name);
  const zip = new JSZip();
  debug(`Zipping contents of ${sourceDir} to ${zipFilePath}`);

  const zipDirRecursive = (dir: string): void => {
    const dirents = fs.readdirSync(dir, { withFileTypes: true });
    for (const dirent of dirents) {
      const fullPath = path.resolve(dir, dirent.name);
      if (dirent.isDirectory()) {
        zipDirRecursive(fullPath);
      } else {
        const relPath = path.relative(sourceDir, fullPath);
        // Ensure only posix paths are added to zip files
        const relPosixPath = relPath.replace(/\\/g, '/');
        zip.file(relPosixPath, fs.createReadStream(fullPath));
      }
    }
  };

  zipDirRecursive(sourceDir);

  const zipBuf = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 3 },
  });

  fs.writeFileSync(zipFilePath, zipBuf);

  debug('Zip file written');

  return zipFilePath;
};
