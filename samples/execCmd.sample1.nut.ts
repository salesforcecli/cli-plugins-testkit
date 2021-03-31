import { execCmd } from '../src/execCmd';
import { expect } from 'chai';

describe('execCmd', () => {
  it('should run sync commands', () => {
    const rv = execCmd('config:list');
    expect(rv.shellOutput).to.contain('successfully did something');
  });
});
