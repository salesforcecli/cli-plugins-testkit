import { execCmd } from '../src/execCmd';
import { TestSession } from '../src/testSession';
import { getString } from '@salesforce/ts-types';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create({
      project: {
        name: 'MyTestProject',
      },
      setupCommands: ['sfdx force:org:create edition=Developer'],
    });
  });

  it('using testkit to run commands with an org', () => {
    const username = getString(testSession.setup[0], 'result.username');
    execCmd(`force:source:deploy -x package.xml -u ${username}`, { ensureExitCode: 0 });
  });

  after(async () => {
    await testSession?.clean();
  });
});
