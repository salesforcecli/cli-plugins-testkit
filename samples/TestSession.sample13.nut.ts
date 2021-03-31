import { execCmd } from '../src/execCmd';
import { TestSession } from '../src/testSession';

/*
   NOTE: you could also change the cwd for one command by overriding in execCmd options.
*/

describe('TestSession', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create({
      project: {
        name: 'MyTestProject',
      },
    });
  });

  it('should execute a command from the default cwd', () => {
    execCmd('config:get defaultusername');
  });

  it('should execute a command from the new cwd stub', () => {
    // Change the stubbed process.cwd dir
    testSession.stubCwd(__dirname);
    execCmd('config:get defaultusername');
  });

  after(async () => {
    await testSession?.clean();
  });
});
