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
import { execCmd } from '../src/execCmd';

describe('execCmd', () => {
  // This would actually be set in the shell or CI environment.
  process.env.TESTKIT_EXECUTABLE_PATH = 'sf';

  it('should use the specified Salesforce CLI executable', () => {
    execCmd('config:list');
  });
});
