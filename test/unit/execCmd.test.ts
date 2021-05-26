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
import { fs } from '@salesforce/core';
import { Duration, env } from '@salesforce/kit';
import { stubMethod } from '@salesforce/ts-sinon';
import * as shelljs from 'shelljs';
import { ShellString } from 'shelljs';
import { execCmd } from '../../src/execCmd';

describe('execCmd (sync)', () => {
  const sandbox = sinon.createSandbox();
  const cmd = 'force:user:create -a testuser1';
  const output = {
    status: 0,
    result: [{ foo: 'bar' }],
  };

  afterEach(() => {
    sandbox.restore();
  });

  it('should default to bin/run executable', () => {
    const binPath = join('bin', 'run');
    sandbox.stub(fs, 'fileExistsSync').returns(true);
    const shellString = new ShellString(JSON.stringify(output));
    const execStub = stubMethod(sandbox, shelljs, 'exec').returns(shellString);
    execCmd(cmd);
    expect(execStub.args[0][0]).to.equal(`${binPath} ${cmd}`);
  });

  it('should accept valid sfdx path in env var', () => {
    const binPath = join('sfdx-cli', 'bin', 'sfdx');
    sandbox.stub(fs, 'fileExistsSync').returns(true);
    sandbox.stub(env, 'getString').returns(binPath);
    const shellString = new ShellString(JSON.stringify(output));
    const execStub = stubMethod(sandbox, shelljs, 'exec').returns(shellString);
    execCmd(cmd);
    expect(execStub.args[0][0]).to.equal(`${binPath} ${cmd}`);
  });

  it('should accept valid executable in the system path', () => {
    const binPath = 'sfdx';
    sandbox.stub(shelljs, 'which').returns(new ShellString('/usr/local/bin/sfdx'));
    sandbox.stub(env, 'getString').returns(binPath);
    const shellString = new ShellString(JSON.stringify(output));
    const execStub = stubMethod(sandbox, shelljs, 'exec').returns(shellString);
    execCmd(cmd);
    expect(execStub.args[0][0]).to.equal(`${binPath} ${cmd}`);
  });

  it('should error when executable path not found', () => {
    const binPath = join('bin', 'run');
    try {
      execCmd(cmd);
      assert(false, 'Expected an error to be thrown');
    } catch (err: unknown) {
      expect((err as Error).message).to.equal(`Cannot find specified executable path: ${binPath}`);
    }
  });

  it('should throw an error when ensureExitCode does not match exit code', () => {
    sandbox.stub(fs, 'fileExistsSync').returns(true);
    const shellString = new ShellString(JSON.stringify(output));
    shellString.code = 0;
    stubMethod(sandbox, shelljs, 'exec').returns(shellString);
    try {
      execCmd(cmd, { ensureExitCode: 100 });
      assert(false, 'Expected an error to be thrown');
    } catch (err: unknown) {
      expect((err as Error).message).to.contain('Unexpected exit code for command');
      expect((err as Error).message).to.contain('Expected: 100 Actual: 0');
    }
  });

  it('should return ExecCmdResult with shellOutput and Duration', () => {
    sandbox.stub(fs, 'fileExistsSync').returns(true);
    const shellString = new ShellString(JSON.stringify(output));
    stubMethod(sandbox, shelljs, 'exec').returns(shellString);
    const result = execCmd(cmd);
    expect(result).to.have.deep.property('shellOutput', shellString);
    expect(result).to.have.property('execCmdDuration');
    expect(result.execCmdDuration).to.be.instanceOf(Duration);
    expect(result.jsonOutput).to.equal(undefined);
    expect(result.jsonError).to.equal(undefined);
  });

  it('should return ExecCmdResult when async = false', () => {
    sandbox.stub(fs, 'fileExistsSync').returns(true);
    const shellString = new ShellString(JSON.stringify(output));
    stubMethod(sandbox, shelljs, 'exec').returns(shellString);
    const result = execCmd(cmd, { async: false });
    expect(result).to.have.deep.property('shellOutput', shellString);
    expect(result).to.have.property('execCmdDuration');
    expect(result.execCmdDuration).to.be.instanceOf(Duration);
    expect(result.jsonOutput).to.equal(undefined);
    expect(result.jsonError).to.equal(undefined);
  });

  it('should return ExecCmdResult with jsonOutput when command includes --json', () => {
    sandbox.stub(fs, 'fileExistsSync').returns(true);
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
    sandbox.stub(fs, 'fileExistsSync').returns(true);
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

  it('should override shell default', () => {
    const shellOverride = 'powershell.exe';
    stubMethod(sandbox, env, 'getString')
      .withArgs('TESTKIT_EXECUTABLE_PATH')
      .returns(null)
      .withArgs('TESTKIT_EXEC_SHELL')
      .returns(shellOverride);
    sandbox.stub(fs, 'fileExistsSync').returns(true);
    const shellString = new ShellString(JSON.stringify(output));
    const execStub = stubMethod(sandbox, shelljs, 'exec').returns(shellString);
    execCmd(cmd);
    expect(execStub.args[0][1]).to.have.property('shell', shellOverride);
  });
});

describe('execCmd (async)', () => {
  const sandbox = sinon.createSandbox();
  const cmd = 'force:user:create -a testuser1';
  const output = {
    status: 0,
    result: [{ foo: 'bar' }],
  };

  afterEach(() => {
    sandbox.restore();
  });

  it('should default to bin/run executable', async () => {
    const binPath = join('bin', 'run');
    sandbox.stub(fs, 'fileExistsSync').returns(true);
    const shellString = new ShellString(JSON.stringify(output));
    const execStub = stubMethod(sandbox, shelljs, 'exec').yields(0, shellString, '');
    await execCmd(cmd, { async: true });
    expect(execStub.args[0][0]).to.equal(`${binPath} ${cmd}`);
  });

  it('should accept valid sfdx path in env var', async () => {
    const binPath = join('sfdx-cli', 'bin', 'sfdx');
    sandbox.stub(fs, 'fileExistsSync').returns(true);
    sandbox.stub(env, 'getString').returns(binPath);
    const shellString = new ShellString(JSON.stringify(output));
    const execStub = stubMethod(sandbox, shelljs, 'exec').yields(0, shellString, '');
    await execCmd(cmd, { async: true });
    expect(execStub.args[0][0]).to.equal(`${binPath} ${cmd}`);
  });

  it('should accept valid executable in the system path', async () => {
    const binPath = 'sfdx';
    sandbox.stub(shelljs, 'which').returns(new ShellString('/usr/local/bin/sfdx'));
    sandbox.stub(env, 'getString').returns(binPath);
    const shellString = new ShellString(JSON.stringify(output));
    const execStub = stubMethod(sandbox, shelljs, 'exec').yields(0, shellString, '');
    await execCmd(cmd, { async: true });
    expect(execStub.args[0][0]).to.equal(`${binPath} ${cmd}`);
  });

  it('should error when executable path not found', async () => {
    const binPath = join('bin', 'run');
    try {
      await execCmd(cmd, { async: true });
      assert(false, 'Expected an error to be thrown');
    } catch (err: unknown) {
      expect((err as Error).message).to.equal(`Cannot find specified executable path: ${binPath}`);
    }
  });

  it('should throw an error when ensureExitCode does not match exit code', async () => {
    sandbox.stub(fs, 'fileExistsSync').returns(true);
    const shellString = new ShellString(JSON.stringify(output));
    stubMethod(sandbox, shelljs, 'exec').yields(0, shellString, '');
    try {
      await execCmd(cmd, { async: true, ensureExitCode: 100 });
      assert(false, 'Expected an error to be thrown');
    } catch (err: unknown) {
      expect((err as Error).message).to.contain('Unexpected exit code for command');
      expect((err as Error).message).to.contain('Expected: 100 Actual: 0');
    }
  });

  it('should return ExecCmdResult with shellOutput and Duration', async () => {
    sandbox.stub(fs, 'fileExistsSync').returns(true);
    const shellString = new ShellString(JSON.stringify(output));
    stubMethod(sandbox, shelljs, 'exec').yields(0, shellString, '');
    const result = await execCmd(cmd, { async: true });
    expect(result).to.have.deep.property('shellOutput', shellString);
    expect(result).to.have.property('execCmdDuration');
    expect(result.execCmdDuration).to.be.instanceOf(Duration);
    expect(result.jsonOutput).to.equal(undefined);
    expect(result.jsonError).to.equal(undefined);
  });

  it('should return ExecCmdResult with jsonOutput when command includes --json', async () => {
    sandbox.stub(fs, 'fileExistsSync').returns(true);
    const shellString = new ShellString(JSON.stringify(output));
    stubMethod(sandbox, shelljs, 'exec').yields(0, shellString, '');

    const result = await execCmd(`${cmd} --json`, { async: true });
    expect(result).to.have.deep.property('shellOutput', shellString);
    expect(result).to.have.property('execCmdDuration');
    expect(result.execCmdDuration).to.be.instanceOf(Duration);
    expect(result.jsonOutput).to.deep.equal(output);
    expect(result.jsonError).to.equal(undefined);
  });

  it('should return ExecCmdResult with jsonError when command includes --json and output not parseable', async () => {
    sandbox.stub(fs, 'fileExistsSync').returns(true);
    const shellString = new ShellString('try JSON parsing this');
    stubMethod(sandbox, shelljs, 'exec').yields(0, shellString, '');

    const result = await execCmd(`${cmd} --json`, { async: true });
    expect(result).to.have.deep.property('shellOutput', shellString);
    expect(result).to.have.property('execCmdDuration');
    expect(result.execCmdDuration).to.be.instanceOf(Duration);
    expect(result.jsonOutput).to.deep.equal(undefined);
    expect(result.jsonError).to.be.an('Error');
    expect(result.jsonError?.name).to.equal('JsonParseError');
    expect(result.jsonError?.message).to.equal(`Parse error in file unknown on line 1${EOL}try JSON parsing this`);
  });

  it('should override shell default', async () => {
    const shellOverride = 'powershell.exe';
    stubMethod(sandbox, env, 'getString')
      .withArgs('TESTKIT_EXECUTABLE_PATH')
      .returns(null)
      .withArgs('TESTKIT_EXEC_SHELL')
      .returns(shellOverride);
    sandbox.stub(fs, 'fileExistsSync').returns(true);
    const shellString = new ShellString(JSON.stringify(output));
    const execStub = stubMethod(sandbox, shelljs, 'exec').yields(0, shellString, '');
    await execCmd(cmd, { async: true });
    expect(execStub.args[0][1]).to.have.property('shell', shellOverride);
  });
});
