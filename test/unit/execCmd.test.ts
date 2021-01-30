/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { EOL } from 'os';
import { join } from 'path';
import { expect, assert } from 'chai';
import * as sinon from 'sinon';
import { fs as fsCore } from '@salesforce/core';
import { env, Duration } from '@salesforce/kit';
import { stubMethod } from '@salesforce/ts-sinon';
import * as shelljs from 'shelljs';
import { ShellString } from 'shelljs';
import { buildCmd, execCmd, execCmdAsync } from '../../lib/execCmd';

describe('buildCmd', () => {
  const sandbox = sinon.createSandbox();
  const cmd = 'force:user:create -a testuser1';

  afterEach(() => {
    sandbox.restore();
  });

  it('should default to bin/run binary', () => {
    sandbox.stub(fsCore, 'fileExistsSync').returns(true);
    expect(buildCmd(cmd)).to.equal(`bin/run ${cmd}`);
  });

  it('should accept sfdx as a binary', () => {
    expect(buildCmd(cmd, 'sfdx')).to.equal(`sfdx ${cmd}`);
  });

  it('should accept valid sfdx path as a binary', () => {
    sandbox.stub(fsCore, 'fileExistsSync').returns(true);
    const binPath = join('sfdx-cli', 'bin', 'sfdx');
    expect(buildCmd(cmd, binPath)).to.equal(`${binPath} ${cmd}`);
  });

  it('should accept valid sfdx path in env var', () => {
    const binPath = join('sfdx-cli', 'bin', 'sfdx');
    sandbox.stub(fsCore, 'fileExistsSync').returns(true);
    sandbox.stub(env, 'getString').returns(binPath);
    expect(buildCmd(cmd)).to.equal(`${binPath} ${cmd}`);
  });

  it('should error when binary path not found', () => {
    const binPath = join('sfdx-cli', 'bin', 'sfdx');
    try {
      buildCmd(cmd, binPath);
      assert(false, 'Expected an error to be thrown');
    } catch (err: unknown) {
      expect((err as Error).message).to.equal(`Cannot find specified binary path: ${binPath}`);
    }
  });
});

describe('execCmd', () => {
  const sandbox = sinon.createSandbox();
  const cmd = 'bin/run force:user:create -a testuser1';
  const output = {
    status: 0,
    result: [{ foo: 'bar' }],
  };

  afterEach(() => {
    sandbox.restore();
  });

  it('should throw an error when async option passed', () => {
    try {
      execCmd(cmd, { async: true });
      assert(false, 'Expected an error to be thrown');
    } catch (err: unknown) {
      expect((err as Error).message).to.equal(
        'execCmd must be run synchronously.  Use execCmdAsync to run asynchronously.'
      );
    }
  });

  it('should throw an error when ensureExitCode does not match exit code', () => {
    const shellString = new ShellString(JSON.stringify(output));
    shellString.code = 0;
    stubMethod(sandbox, shelljs, 'exec').returns(shellString);
    try {
      execCmd(cmd, { ensureExitCode: 100 });
      assert(false, 'Expected an error to be thrown');
    } catch (err: unknown) {
      expect((err as Error).message).to.equal(`Unexpected exit code for command: ${cmd}. Expected: 100 Actual: 0`);
    }
  });

  it('should return ExecCmdResult with shellOutput and Duration', () => {
    const shellString = new ShellString(JSON.stringify(output));
    stubMethod(sandbox, shelljs, 'exec').returns(shellString);
    const result = execCmd(cmd);
    expect(result).to.have.deep.property('shellOutput', shellString);
    expect(result).to.have.property('execCmdDuration');
    expect(result.execCmdDuration).to.be.instanceOf(Duration);
    expect(result.jsonOutput).to.equal(undefined);
    expect(result.jsonError).to.equal(undefined);
  });

  it('should return ExecCmdResult with jsonOutput when command includes --json', () => {
    const shellString = new ShellString(JSON.stringify(output));
    stubMethod(sandbox, shelljs, 'exec').returns(shellString);

    const result = execCmd(`${cmd} --json`);
    expect(result).to.have.deep.property('shellOutput', shellString);
    expect(result).to.have.property('execCmdDuration');
    expect(result.execCmdDuration).to.be.instanceOf(Duration);
    expect(result.jsonOutput).to.deep.equal(output);
    expect(result.jsonError).to.equal(undefined);
  });

  it('should return ExecCmdResult with jsonError when command includes --json and output not parseable', () => {
    const shellString = new ShellString('try JSON parsing this');
    stubMethod(sandbox, shelljs, 'exec').returns(shellString);

    const result = execCmd(`${cmd} --json`);
    expect(result).to.have.deep.property('shellOutput', shellString);
    expect(result).to.have.property('execCmdDuration');
    expect(result.execCmdDuration).to.be.instanceOf(Duration);
    expect(result.jsonOutput).to.deep.equal(undefined);
    expect(result.jsonError).to.be.an('Error');
    expect(result.jsonError?.name).to.equal('JsonParseError');
    expect(result.jsonError?.message).to.equal(`Parse error in file unknown on line 1${EOL}try JSON parsing this`);
  });
});

describe('execCmdAsync', () => {
  const sandbox = sinon.createSandbox();
  const cmd = 'bin/run force:user:create -a testuser1';
  const output = {
    status: 0,
    result: [{ foo: 'bar' }],
  };

  afterEach(() => {
    sandbox.restore();
  });

  it('should throw an error when async option is false', async () => {
    try {
      await execCmdAsync(cmd, { async: false });
      assert(false, 'Expected an error to be thrown');
    } catch (err: unknown) {
      expect((err as Error).message).to.equal(
        'execCmdAsync must be run asynchronously.  Use execCmd to run synchronously.'
      );
    }
  });

  it('should throw an error when ensureExitCode does not match exit code', async () => {
    const shellString = new ShellString(JSON.stringify(output));
    stubMethod(sandbox, shelljs, 'exec').yields(0, shellString, '');
    try {
      await execCmdAsync(cmd, { ensureExitCode: 100 });
      assert(false, 'Expected an error to be thrown');
    } catch (err: unknown) {
      expect((err as Error).message).to.equal(`Unexpected exit code for command: ${cmd}. Expected: 100 Actual: 0`);
    }
  });

  it('should return ExecCmdResult with shellOutput and Duration', async () => {
    const shellString = new ShellString(JSON.stringify(output));
    stubMethod(sandbox, shelljs, 'exec').yields(0, shellString, '');
    const result = await execCmdAsync(cmd);
    expect(result).to.have.deep.property('shellOutput', shellString);
    expect(result).to.have.property('execCmdDuration');
    expect(result.execCmdDuration).to.be.instanceOf(Duration);
    expect(result.jsonOutput).to.equal(undefined);
    expect(result.jsonError).to.equal(undefined);
  });

  it('should return ExecCmdResult with jsonOutput when command includes --json', async () => {
    const shellString = new ShellString(JSON.stringify(output));
    stubMethod(sandbox, shelljs, 'exec').yields(0, shellString, '');

    const result = await execCmdAsync(`${cmd} --json`);
    expect(result).to.have.deep.property('shellOutput', shellString);
    expect(result).to.have.property('execCmdDuration');
    expect(result.execCmdDuration).to.be.instanceOf(Duration);
    expect(result.jsonOutput).to.deep.equal(output);
    expect(result.jsonError).to.equal(undefined);
  });

  it('should return ExecCmdResult with jsonError when command includes --json and output not parseable', async () => {
    const shellString = new ShellString('try JSON parsing this');
    stubMethod(sandbox, shelljs, 'exec').yields(0, shellString, '');

    const result = await execCmdAsync(`${cmd} --json`);
    expect(result).to.have.deep.property('shellOutput', shellString);
    expect(result).to.have.property('execCmdDuration');
    expect(result.execCmdDuration).to.be.instanceOf(Duration);
    expect(result.jsonOutput).to.deep.equal(undefined);
    expect(result.jsonError).to.be.an('Error');
    expect(result.jsonError?.name).to.equal('JsonParseError');
    expect(result.jsonError?.message).to.equal(`Parse error in file unknown on line 1${EOL}try JSON parsing this`);
  });
});
