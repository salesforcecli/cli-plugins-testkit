import { execCmd } from '../src/execCmd';
import { TestSession } from '../src/testSession';

describe('TestSession', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create({
      project: {
        name: 'MyTestProject',
      },
    });
  });

  it('should run a command from within a generated project', () => {
    execCmd('force:source:convert', { ensureExitCode: 0 });
  });

  after(async () => {
    await testSession?.clean();
  });
});
