import { execCmd } from '../src/execCmd';
import { TestSession } from '../src/testSession';
import * as shelljs from 'shelljs';

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
        { executable: 'sfdx', config: 'config/project-scratch-def.json', setDefault: true },
        // explicitly set a username
        { executable: 'sfdx', config: 'config/project-scratch-def.json', username },
      ],
    });
  });

  it('should use both orgs created as part of setupCommands', () => {
    const firstOrg = testSession.orgs.get('default');
    execCmd(`force:source:retrieve -m ApexClass -u ${firstOrg}`, { ensureExitCode: 0 });
    execCmd(`force:source:retrieve -p force-app -u ${username}`, { ensureExitCode: 0 });
  });

  it('should create a 3rd org and get the username from the json output', () => {
    // Note that this org will not be deleted for you by TestSession.
    const jsonOutput = execCmd<{ username: string }>('force:org:create -f config/project-scratch-def.json --json', {
      cli: 'sfdx',
    }).jsonOutput;
    const thirdOrg = jsonOutput.result.username;
    execCmd(`force:source:pull -u ${thirdOrg}`);
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
    const org1 = shelljs.exec('sfdx force:org:create edition=Developer', { async: true });
    const org2 = shelljs.exec('sfdx force:org:create edition=Developer', { async: true });
    await Promise.all([org1, org2]);
  });
});
