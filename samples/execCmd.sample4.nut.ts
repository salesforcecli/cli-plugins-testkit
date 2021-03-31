import { execCmd } from '../src/execCmd';

describe('execCmd', () => {
  // This would actually be set in the shell or CI environment.
  process.env.TESTKIT_EXECUTABLE_PATH = 'sfdx';

  it('should use the specified Salesforce CLI executable', () => {
    execCmd('config:list');
  });
});
