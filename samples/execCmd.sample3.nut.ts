import { execCmd } from '../src/execCmd';

describe('Sample NUT', () => {
  it('should ensure a specific exit code', () => {
    execCmd('config:list', { ensureExitCode: 0 });
  });
});
