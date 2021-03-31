import { execCmd } from '../src/execCmd';
import { TestSession } from '../src/testSession';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create();
  });

  it('should archive the TestSession contents in process.cwd() when a test fails', () => {
    execCmd(`config:set instanceUrl=${testSession.id}`, { ensureExitCode: 0 });
  });

  afterEach(async function () {
    if (this.currentTest?.state !== 'passed') {
      await testSession?.zip();
    }
  });

  after(async () => {
    await testSession?.clean();
  });
});
