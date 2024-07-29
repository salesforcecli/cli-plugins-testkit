/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
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
