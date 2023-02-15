/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export * from './genUniqueString';
export * from './execCmd';
export { prepareForAuthUrl, prepareForJwt } from './hubAuth';
export * from './testProject';
export * from './testSession';
export { Duration } from '@salesforce/kit';

import { SinonSandbox } from 'sinon';
import { SfCommand, Ux } from '@salesforce/sf-plugins-core';
import { ux } from '@oclif/core';
import { Spinner } from '@salesforce/sf-plugins-core/lib/ux';

export function makeUxStubs(sandbox: SinonSandbox) {
  const startSpinner = sandbox.stub(Spinner.prototype, 'start');
  const stopSpinner = sandbox.stub(Spinner.prototype, 'stop');
  return {
    SfCommand: {
      log: sandbox.stub(SfCommand.prototype, 'log'),
      logToStderr: sandbox.stub(SfCommand.prototype, 'logToStderr'),
      logSuccess: sandbox.stub(SfCommand.prototype, 'logSuccess'),
      logSensitive: sandbox.stub(SfCommand.prototype, 'logSensitive'),
      info: sandbox.stub(SfCommand.prototype, 'info'),
      warn: sandbox.stub(SfCommand.prototype, 'warn'),
      table: sandbox.stub(SfCommand.prototype, 'table'),
      url: sandbox.stub(SfCommand.prototype, 'url'),
      styledHeader: sandbox.stub(SfCommand.prototype, 'styledHeader'),
      styledObject: sandbox.stub(SfCommand.prototype, 'styledObject'),
      styledJSON: sandbox.stub(SfCommand.prototype, 'styledJSON'),
      startSpinner,
      stopSpinner,
    },
    '@oclif/core': {
      info: sandbox.stub(ux, 'info'),
      log: sandbox.stub(ux, 'log'),
      warn: sandbox.stub(ux, 'warn'),
      annotation: sandbox.stub(ux, 'annotation'),
      table: sandbox.stub(ux, 'table'),
      url: sandbox.stub(ux, 'url'),
      styledHeader: sandbox.stub(ux, 'styledHeader'),
      styledObject: sandbox.stub(ux, 'styledObject'),
      styledJSON: sandbox.stub(ux, 'styledJSON'),
      startSpinner: sandbox.stub(ux.action, 'start'),
      stopSpinner: sandbox.stub(ux.action, 'stop'),
    },
    Ux: {
      log: sandbox.stub(Ux.prototype, 'log'),
      warn: sandbox.stub(Ux.prototype, 'warn'),
      table: sandbox.stub(Ux.prototype, 'table'),
      url: sandbox.stub(Ux.prototype, 'url'),
      styledHeader: sandbox.stub(Ux.prototype, 'styledHeader'),
      styledObject: sandbox.stub(Ux.prototype, 'styledObject'),
      styledJSON: sandbox.stub(Ux.prototype, 'styledJSON'),
      startSpinner,
      stopSpinner,
    },
  };
}
