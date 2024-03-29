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
      },
      scratchOrgs: [{ edition: 'developer', config: 'config/project-scratch-def.json' }],
    });
  });

  it('using testkit to run commands with an org', () => {
    const username = [...testSession.orgs.keys()][0];
    execCmd(`project:deploy:start -x package.xml -o ${username}`, { ensureExitCode: 0 });
  });

  after(async () => {
    await testSession?.clean();
  });
});
