import { execCmd } from '../src/execCmd';
import { TestSession } from '../src/testSession';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create();
  });

  it('should delete projects, orgs, and the TestSession in after()', () => {
    execCmd('config:list', { ensureExitCode: 0 });
  });

  after(async () => {
    await testSession?.clean();
  });
});
