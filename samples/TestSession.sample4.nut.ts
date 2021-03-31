import { execCmd } from '../src/execCmd';
import { TestSession } from '../src/testSession';

describe('TestSession', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create();
  });

  it('should allow access to anything on TestSession without a project', () => {
    execCmd(`config:set instanceUrl=${testSession.id}`, { ensureExitCode: 0 });
  });

  after(async () => {
    await testSession?.clean();
  });
});
