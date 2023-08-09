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
    testSession = await TestSession.create({
      project: {
        name: 'MyTestProject',
        apiVersion: '57.0',
      },
    });
  });

  it('should run a command from within a generated project', () => {
    execCmd('project:convert:source', { ensureExitCode: 0 });
  });

  after(async () => {
    await testSession?.clean();
  });
});
