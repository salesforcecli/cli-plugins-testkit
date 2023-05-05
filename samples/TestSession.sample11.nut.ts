/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import { execCmd } from '../src/execCmd';
import { TestSession } from '../src/testSession';
import { TestProject } from '../src/testProject';

describe('TestSession', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create({
      project: {
        sourceDir: path.join(process.cwd(), 'localTestProj'),
      },
      scratchOrgs: [{ executable: 'sf', config: 'config/project-scratch-def.json' }],
    });
  });

  it('using testkit to run sync commands', () => {
    execCmd('config:list', { ensureExitCode: 0 });
  });

  it('should create another project and set the cwd stub', () => {
    // Create another test project and reset the cwd stub
    const project2 = new TestProject({
      name: 'project2',
    });
    testSession.stubCwd(project2.dir);
    const username = [...testSession.orgs.keys()][0];
    execCmd(`project:retrieve:start -o ${username}`);
  });

  after(async () => {
    await testSession?.clean();
  });
});
