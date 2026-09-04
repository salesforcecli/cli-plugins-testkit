/*
 * Copyright 2025, Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
