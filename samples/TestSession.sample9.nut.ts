import { execCmd } from '../src/execCmd';
import { TestSession } from '../src/testSession';

describe('TestSession', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create({
      project: {
        name: 'MyTestProject',
      },
      scratchOrgs: [{ executable: 'sfdx', edition: 'developer' }],
    });

    execCmd('force:source:push', { cli: 'sfdx' });
  });

  it('using testkit to run commands with an org', () => {
    const username = [...testSession.orgs.keys()][0];
    execCmd(`user:create -u ${username}`, { ensureExitCode: 0 });
  });

  after(async () => {
    await testSession?.clean();
  });
});
