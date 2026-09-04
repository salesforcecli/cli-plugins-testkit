/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import JSZip from 'jszip';
import Debug from 'debug';

export type ZipDirConfig = {
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
};

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
