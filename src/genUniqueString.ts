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

import { randomBytes } from 'node:crypto';
import { format } from 'node:util';

/**
 * Returns a unique string. If template is supplied and contains a replaceable string (see node library util.format)
 * the unique string will be applied to the template using util.format. If the template does not contain a replaceable
 * string the unique string will be appended to the template.
 *
 * @param {string} template - can contain a replaceable string (%s)
 * @returns {string}
 */
export const genUniqueString = (template?: string): string => {
  const uniqueString = randomBytes(8).toString('hex');
  if (!template) {
    return uniqueString;
  }
  return template.includes('%s') ? format(template, uniqueString) : `${template}${uniqueString}`;
};
