/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { execCmd } from '../src/execCmd';

describe('execCmd', () => {
  // This would actually be set in the shell or CI environment.
  process.env.TESTKIT_EXECUTABLE_PATH = 'sf';

  it('should use the specified Salesforce CLI executable', () => {
    execCmd('config:list');
  });
});
