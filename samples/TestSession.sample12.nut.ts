/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as shelljs from 'shelljs';
import { execCmd } from '../src/execCmd';
import { TestSession } from '../src/testSession';

/*
   NOTE: Scratch orgs can take a while to create so you may want to create them in parallel
         in a global test fixture and refer to them in your tests.  There are lots of
         possibilities though and this example shows a few ways how you might create multiple
         scratch orgs in a test file.
*/

describe('TestSession', () => {
  let testSession: TestSession;
  const username = 'user@test.org';

  before(async () => {
    testSession = await TestSession.create({
      project: {
        name: 'TestProj1',
      },
      scratchOrgs: [
        // rely on defaultusername
        { executable: 'sf', config: 'config/project-scratch-def.json', setDefault: true },
        // explicitly set a username
        { executable: 'sf', config: 'config/project-scratch-def.json', username },
      ],
    });
  });

  it('should use both orgs created as part of setupCommands', () => {
    const firstOrg = testSession.orgs.get('default');
    execCmd(`project:retrieve:start -m ApexClass -o ${firstOrg}`, { ensureExitCode: 0 });
    execCmd(`project:retrieve:start -p force-app -o ${username}`, { ensureExitCode: 0 });
  });

  it('should create a 3rd org and get the username from the json output', () => {
    // Note that this org will not be deleted for you by TestSession.
    const jsonOutput = execCmd<{ username: string }>('env:create:scratch -f config/project-scratch-def.json --json', {
      cli: 'sf',
    }).jsonOutput;
    const thirdOrg = jsonOutput.result.username;
    execCmd(`project:retrieve:start -o ${thirdOrg}`);
  });

  after(async () => {
    await testSession?.clean();
  });
});

// Create 2 scratch orgs in parallel.
describe('Sample NUT 2', () => {
  before(async () => {
    // NOTE: this is for demonstration purposes and doesn't work as is
    //       since shelljs does not return promises, but conveys the point.
    const org1 = shelljs.exec('sf env:create:scratch edition=Developer', { async: true });
    const org2 = shelljs.exec('sf env:create:scratch edition=Developer', { async: true });
    await Promise.all([org1, org2]);
  });
});
