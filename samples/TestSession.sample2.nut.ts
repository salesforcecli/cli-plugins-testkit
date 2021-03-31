import { execCmd } from '../src/execCmd';
import { TestSession } from '../src/testSession';
import * as path from 'path';

describe('TestSession', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create({
      project: {
        sourceDir: path.join(process.cwd(), 'localTestProj'),
      },
    });
  });

  it('should run a command from within a locally copied project', () => {
    execCmd('config:list', { ensureExitCode: 0 });
  });

  after(async () => {
    await testSession?.clean();
  });
});
