import { execCmd } from '../src/execCmd';
import { expect } from 'chai';

describe('Sample NUT', () => {
  it('should run async commands', async () => {
    const rv = await execCmd('config:list', { async: true });
    expect(rv.shellOutput).to.contain('successfully did something');
  });
});
