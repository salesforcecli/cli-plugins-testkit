/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { tmpdir } from 'os';
import { expect } from 'chai';
import { execCmd } from '../src/execCmd';
import { TestSession } from '../src/testSession';

describe('TestSession', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create({
      // NOTE: you can also override with an env var.
      //       See section on Testkit env vars.
      sessionDir: tmpdir(),
    });
  });

  it('should use overridden session directory', () => {
    execCmd(`config:set org-instance-url=${testSession.id}`);
    expect(testSession.dir).to.equal(tmpdir());
  });

  after(async () => {
    await testSession?.clean();
  });
});
