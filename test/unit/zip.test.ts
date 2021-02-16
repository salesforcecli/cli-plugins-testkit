/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join as pathJoin } from 'path';
import { EventEmitter } from 'events';
import { assert, expect } from 'chai';
import { fs as fsCore } from '@salesforce/core';
import { stubMethod } from '@salesforce/ts-sinon';
import * as sinon from 'sinon';
import { zipDir } from '../../lib/zip';

describe('zipDir', () => {
  const sandbox = sinon.createSandbox();

  class WriteStreamMock extends EventEmitter {
    public write = sandbox.stub().returns(true);
    public end = sandbox.stub().callsFake(() => {
      this.emit('end');
    });
  }

  afterEach(() => {
    sandbox.restore();
  });

  it('should zip a directory', async () => {
    stubMethod(sandbox, fsCore, 'createWriteStream').returns(new WriteStreamMock());
    const zipName = 'zipTest1.zip';
    const zipPath = await zipDir({
      sourceDir: pathJoin(process.cwd(), 'test', 'unit'),
      destDir: process.cwd(),
      name: zipName,
    });
    expect(zipPath).to.equal(pathJoin(process.cwd(), zipName));
  });

  it('should fail on error', async () => {
    stubMethod(sandbox, fsCore, 'createWriteStream').returns(new WriteStreamMock());
    const zipName = 'zipTest2.zip';

    try {
      await zipDir({
        sourceDir: '',
        destDir: process.cwd(),
        name: zipName,
      });
      assert(false, 'Expected zipDir() to throw an error');
    } catch (e) {
      const errMsg = 'diretory dirpath argument must be a non-empty string value';
      expect(e).to.have.property('message', errMsg);
    }
  });
});
