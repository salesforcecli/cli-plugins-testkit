import { execCmd } from '../src/execCmd';
import { expect } from 'chai';

// This would typically be imported from your command.
type ConfigResult = {
  key: string;
  location: string;
  value: string;
};

describe('execCmd', () => {
  it('should provide typed and parsed JSON output', () => {
    // Simply have your command use the --json flag and provide a type.
    const rv = execCmd<ConfigResult[]>('config:list --json').jsonOutput;
    expect(rv.result[0].key).equals('defaultdevhubusername');
  });
});
