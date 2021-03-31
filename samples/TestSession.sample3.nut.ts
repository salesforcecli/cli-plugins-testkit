import { execCmd } from '../src/execCmd';
import { TestSession } from '../src/testSession';

describe('TestSession', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create({
      project: {
        gitClone: 'https://github.com/trailheadapps/ebikes-lwc.git',
      },
    });
  });

  it('should run a command from within a cloned github project', () => {
    execCmd('config:list', { ensureExitCode: 0 });
  });

  after(async () => {
    await testSession?.clean();
  });
});
