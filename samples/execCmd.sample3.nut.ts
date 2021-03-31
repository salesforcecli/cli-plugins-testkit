import { execCmd } from '../src/execCmd';

describe('execCmd', () => {
  it('should ensure a specific exit code', () => {
    execCmd('config:list', { ensureExitCode: 0 });
  });
});
