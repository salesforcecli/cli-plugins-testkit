/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { execCmd } from '../src/execCmd';
import { TestSession } from '../src/testSession';

describe('TestSession', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create();
  });

  it('should allow access to anything on TestSession without a project', () => {
    execCmd(`config:set org-instance-url=${testSession.id}`, { ensureExitCode: 0 });
  });

  after(async () => {
    await testSession?.clean();
  });
});
