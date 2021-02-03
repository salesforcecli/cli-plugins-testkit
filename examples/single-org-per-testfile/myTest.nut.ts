// this file is an example of doing everything "manually".  Compare it to the myTestWithSession to see how it's changed
// this file also presumes that somewhere else, a global default devhub has already been auth'd
// used to verify example code.  In real life, use
// import { execCmdAsync, stubs } from 'cli-plugins-testkit';
import { execCmdAsync } from '../../src/execCmd';
import TestSession, { stubs } from '../../src/testSession';

import { fs, fs as fsCore } from '@salesforce/core';
import { expect } from 'chai';

// should be unique across tests
const testAlias = 'myTestOrg';
const projectDir = 'testProjectDataCommands';

describe('test data commands', () => {
  before(async () => {
    if (process.env.LEFTOVERS_MODE && fs.existsSync(projectDir)) {
      // check to see if project already exists.  If so, exit so it can be reused.  If not, we still need to create it
      return;
    }
    // optional stub ~/.sfdx directory.
    // This test creates and deletes an org by alias, but this might be useful to protect existing configuration when working with plugins that modify it (ex: org:list --clean)
    stubs.stubHomeDir(testAlias);
    // stub cwd to be that project.  prevents you from having to pass in cwd to exec on every command
    stubs.stubCWD(projectDir);

    // Make a copy of a project from repo source.
    // You could technically skip this step and use stubCWD to run in your repo source if your commands aren't making local changes that you'd want to undo AND no other commands are using the directory
    // OR there is some project command to create from local/git.  Not sure how useful that is vs. fs.copyFile
    fsCore.copyFile('test/sampleProject', projectDir, undefined);

    // the following commands are whatever org setup is specific to your tests.  We run them with ensureExitCode because if there are any errors, the tests aren't going to work.
    // create a scratch org from a file
    await execCmdAsync(`force:org:create -d 1 -f config/scratch-org-def.json -s`, { ensureExitCode: 0 });
    // push the source
    await execCmdAsync(`force:source:push`, { ensureExitCode: 0 });
    // set some perm
    await execCmdAsync(`force:user:permset:assign -n SomePertSet`, { ensureExitCode: 0 });
    // create some data
    await execCmdAsync(`force:data:tree:import -d data/testPlan.json`, { ensureExitCode: 0 });
    // other typical setup things: install a package, run some apex, create a user, etc.
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
    // leftovers mode will leave all the orgs/projects/stubs as they were
    if (process.env.LEFTOVERS_MODE) {
      return;
    }
    // delete the org
    await execCmdAsync(`force:org:delete -u ${testAlias} -r`);
    // delete the copied project
    await fsCore.remove(projectDir);
    // restore cwd and homeDir
  });
});
