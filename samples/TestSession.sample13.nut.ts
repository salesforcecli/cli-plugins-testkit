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
import { TestSession } from '../src/testSession';

/*
   NOTE: you could also change the cwd for one command by overriding in execCmd options.
*/

describe('TestSession', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create({
      project: {
        name: 'MyTestProject',
      },
    });
  });

  it('should execute a command from the default cwd', () => {
    execCmd('config:get defaultusername');
  });

  it('should execute a command from the new cwd stub', () => {
    // Change the stubbed process.cwd dir
    testSession.stubCwd(__dirname);
    execCmd('config:get defaultusername');
  });

  after(async () => {
    await testSession?.clean();
  });
});
