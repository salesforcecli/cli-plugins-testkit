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
    execCmd(`force:source:deploy -x package.xml -u ${username}`, { ensureExitCode: 0 });
  });

  after(async () => {
    await testSession?.clean();
  });
});
