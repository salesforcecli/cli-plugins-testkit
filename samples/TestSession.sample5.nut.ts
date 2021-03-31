import { execCmd } from '../src/execCmd';
import { TestSession } from '../src/testSession';
import { expect } from 'chai';
import { tmpdir } from 'os';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create({
      // NOTE: you can also override with an env var.
      //       See section on Testkit env vars.
      sessionDir: tmpdir(),
    });
  });

  it('should use overridden session directory', () => {
    execCmd(`config:set instanceUrl=${testSession.id}`);
    expect(testSession.dir).to.equal(tmpdir());
  });

  after(async () => {
    await testSession?.clean();
  });
});
