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
import { expect } from 'chai';
import { execCmd } from '../src/execCmd';

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
    expect(rv?.result[0].key).equals('defaultdevhubusername');
  });
});
