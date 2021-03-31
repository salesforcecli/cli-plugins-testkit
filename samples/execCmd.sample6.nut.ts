import { execCmd } from '../src/execCmd';
import { expect } from 'chai';

describe('Sample NUT', () => {
  it('config:list should execute in less than 5 seconds', () => {
    const t1 = execCmd(`config:list`).execCmdDuration.milliseconds;
    const t2 = execCmd(`config:list`).execCmdDuration.milliseconds;
    const t3 = execCmd(`config:list`).execCmdDuration.milliseconds;
    const aveExecTime = (t1 + t2 + t3) / 3;
    expect(aveExecTime).to.be.lessThan(5000);
  });
});
