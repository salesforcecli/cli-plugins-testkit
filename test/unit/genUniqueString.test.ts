/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { isString } from '@salesforce/ts-types';
import { expect } from 'chai';
import { genUniqueString } from '../../src/genUniqueString';

describe('genUniqueString', () => {
  it('should generate a unique string by default', () => {
    expect(isString(genUniqueString())).to.equal(true);
  });
  it('should append a unique string', () => {
    const str = genUniqueString('foo__');
    expect(isString(str)).to.equal(true);
    expect(str.startsWith('foo__')).to.equal(true);
  });
  it('should replace a token with a unique string', () => {
    const str = genUniqueString('foo__%s__bar');
    expect(isString(str)).to.equal(true);
    expect(str.startsWith('foo__')).to.equal(true);
    expect(str.endsWith('__bar')).to.equal(true);
  });
});
