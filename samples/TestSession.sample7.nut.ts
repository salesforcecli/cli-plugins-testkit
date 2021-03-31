import { execCmd } from '../src/execCmd';
import { TestSession } from '../src/testSession';

describe('TestSession', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create();
  });

  it('should archive the TestSession contents in process.cwd()', () => {
    execCmd('config:list', { ensureExitCode: 0 });
  });

  // NOTE: Must set env var: TESTKIT_ENABLE_ZIP=true
  after(async () => {
    await testSession?.zip();
    await testSession?.clean();
  });
});
