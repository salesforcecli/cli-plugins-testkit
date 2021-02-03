// this file also presumes that somewhere else, a global default devhub has already been auth'd

// used to verify example code.  In real life, use
// import { execCmdAsync, stubs } from 'cli-plugins-testkit';
import { execCmdAsync } from '../../src/execCmd';
import { setup, tearDown } from '../../src/testSession';

import { expect } from 'chai';

// should be unique across tests
const projectPath = 'testProjectDataCommands';

describe('test data commands', () => {
  before(async () => {
    await setup({
      stubCWD: true,
      stubHomeDir: projectPath,
      projectPath,
      projectSource: 'test/sampleProject',
      setupCommands: [
        'sfdx force:org:create -d 1 -f config/scratch-org-def.json -s',
        'sfdx force:source:push',
        'sfdx force:user:permset:assign -n SomePertSet',
        'sfdx force:data:tree:import -d data/testPlan.json',
      ],
    });
  });

  it('json output is correct', async () => {
    const result = await execCmdAsync(`topic:command --someflag 42 --json -u`, { ensureExitCode: 0 });
    expect(result.jsonOutput).to.deep.equal({ something: 'whatever' });
  });

  it('some error throws', async () => {
    const result = await execCmdAsync(`topic:command --someflag 43 --json`, { ensureExitCode: 1 });
    expect(result.jsonOutput).to.deep.equal({ something: 'whatever' });
  });

  after(async () => {
    tearDown(projectPath);
  });
});
