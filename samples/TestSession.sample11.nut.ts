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
import * as path from 'node:path';
import { execCmd } from '../src/execCmd';
import { TestSession } from '../src/testSession';
import { TestProject } from '../src/testProject';

describe('TestSession', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create({
      project: {
        sourceDir: path.join(process.cwd(), 'localTestProj'),
      },
      scratchOrgs: [{ config: 'config/project-scratch-def.json' }],
    });
  });

  it('using testkit to run sync commands', () => {
    execCmd('config:list', { ensureExitCode: 0 });
  });

  it('should create another project and set the cwd stub', () => {
    // Create another test project and reset the cwd stub
    const project2 = new TestProject({
      name: 'project2',
    });
    testSession.stubCwd(project2.dir);
    const username = [...testSession.orgs.keys()][0];
    execCmd(`project:retrieve:start -o ${username}`);
  });

  after(async () => {
    await testSession?.clean();
  });
});
