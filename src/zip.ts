/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { create as createArchive } from 'archiver';
import Debug from 'debug';
import { fs as fsCore } from '@salesforce/core';

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
  const zip = createArchive('zip', { zlib: { level: 3 } });
  const zipFilePath = path.join(destDir, name);
  const output = fsCore.createWriteStream(zipFilePath);
  debug(`Zipping contents of ${sourceDir} to ${zipFilePath}`);

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      debug(`Zip ${zipFilePath} is closed`);
      resolve(zipFilePath);
    });
    output.on('end', () => {
      debug(`Zip data has drained for ${zipFilePath}`);
      resolve(zipFilePath);
    });
    zip.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        debug(`Zip warning for ${zipFilePath}\n${err.message}`);
      } else {
        reject(err);
      }
    });
    zip.on('error', (err) => {
      reject(err);
    });
    zip.pipe(output);
    zip.directory(sourceDir, false);
    zip.finalize().catch((err: unknown) => {
      debug(`Zip finalize error with: ${(err as Error).message}`);
    });
  });
};
