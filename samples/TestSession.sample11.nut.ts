import { execCmd } from '../src/execCmd';
import { TestSession } from '../src/testSession';
import { TestProject } from '../src/testProject';
import * as path from 'path';

describe('TestSession', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create({
      project: {
        sourceDir: path.join(process.cwd(), 'localTestProj'),
      },
      scratchOrgs: [{ executable: 'sfdx', config: 'config/project-scratch-def.json' }],
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
    execCmd(`force:source:pull -u ${username}`);
  });

  after(async () => {
    await testSession?.clean();
  });
});
