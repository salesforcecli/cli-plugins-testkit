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
import fs from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { expect } from 'chai';
import JSZip from 'jszip';
import { zipDir } from '../../src/zip';

describe('zipDir', () => {
  it('should zip a directory', async () => {
    const rootDir = join(tmpdir(), 'testkitZipTest');
    if (fs.existsSync(rootDir)) {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
    const sourceDir = join(rootDir, 'sourceDir');
    const nestedDir = join(sourceDir, 'nestedDir');
    const filePath1 = join(sourceDir, 'file1.txt');
    const filePath2 = join(nestedDir, 'file2.txt');
    let zipPath = '';
    try {
      fs.mkdirSync(nestedDir, { recursive: true });
      fs.writeFileSync(filePath1, 'file 1 content');
      fs.writeFileSync(filePath2, 'file 2 content');
      const zipName = 'myZip.zip';
      const expectedZipPath = join(rootDir, zipName);

      zipPath = await zipDir({
        sourceDir,
        destDir: rootDir,
        name: zipName,
      });

      expect(fs.existsSync(expectedZipPath)).to.equal(true);
      expect(fs.statSync(expectedZipPath).size).to.be.greaterThan(0);
      expect(zipPath).to.equal(expectedZipPath);

      // read the zip to ensure it has the expected files
      const jsZip = new JSZip();
      const zip = await jsZip.loadAsync(fs.readFileSync(zipPath));
      expect(zip.files).to.haveOwnProperty('file1.txt');
      expect(zip.files).to.haveOwnProperty('nestedDir/');
      expect(zip.files).to.haveOwnProperty('nestedDir/file2.txt');
    } finally {
      fs.rmSync(rootDir, { recursive: true, force: true });
    }
  });
});
