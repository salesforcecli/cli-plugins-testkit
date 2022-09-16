/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import { join } from 'path';
import { expect, assert } from 'chai';
import * as sinon from 'sinon';
import { Duration, env } from '@salesforce/kit';
import { stubMethod } from '@salesforce/ts-sinon';
import * as shelljs from 'shelljs';
import { ShellString } from 'shelljs';
import { execCmd, getWaitTime } from '../../src/execCmd';
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

  it('should default to bin/dev executable', () => {
    const binPath = join('bin', 'dev');
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(shelljs, 'which').callsFake((x) => new ShellString(x));
    const shellString = new ShellString(JSON.stringify(output));
    const execStub = stubMethod(sandbox, shelljs, 'exec').returns(shellString);
    execCmd(cmd);
    expect(execStub.args[0][0]).to.equal(`${binPath} ${cmd}`);
  });

  it('should accept valid sfdx path in env var', () => {
    const binPath = join('sfdx-cli', 'bin', 'sfdx');
    sandbox.stub(shelljs, 'which').callsFake((x) => new ShellString(x));
    sandbox.stub(fs, 'existsSync').returns(true);
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
    const binPath = join('bin', 'dev');
    try {
      execCmd(cmd);
      assert(false, 'Expected an error to be thrown');
    } catch (err: unknown) {
      expect((err as Error).message).to.equal(`Cannot find specified executable path: ${binPath}`);
    }
  });

  it('should throw an error when ensureExitCode does not match exit code', () => {
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(shelljs, 'which').callsFake((x) => new ShellString(x));

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
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(shelljs, 'which').callsFake((x) => new ShellString(x));
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
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(shelljs, 'which').callsFake((x) => new ShellString(x));

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
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(shelljs, 'which').callsFake((x) => new ShellString(x));

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
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(shelljs, 'which').callsFake((x) => new ShellString(x));

    const shellString = new ShellString('try JSON parsing this');
    stubMethod(sandbox, shelljs, 'exec').returns(shellString);

    const result = execCmd(`${cmd} --json`);
    expect(result).to.have.deep.property('shellOutput', shellString);
    expect(result).to.have.property('execCmdDuration');
    expect(result.execCmdDuration).to.be.instanceOf(Duration);
    expect(result.jsonOutput).to.deep.equal(undefined);
    expect(result.jsonError).to.be.an('Error');
    expect(result.jsonError?.name).to.equal('JsonParseError');
    expect(result.jsonError?.message).to.match(/Parse error in file unknown on line 1\n\r?try JSON parsing this/);
  });

  it('should override shell default', () => {
    sandbox.stub(shelljs, 'which').callsFake((x) => new ShellString(x));
    const shellOverride = 'powershell.exe';
    stubMethod(sandbox, env, 'getString')
      .withArgs('TESTKIT_EXECUTABLE_PATH')
      .returns(null)
      .withArgs('TESTKIT_EXEC_SHELL')
      .returns(shellOverride);
    sandbox.stub(fs, 'existsSync').returns(true);
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

  it('should default to bin/dev executable', async () => {
    const binPath = join('bin', 'dev');
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(shelljs, 'which').callsFake((x) => new ShellString(x));
    const shellString = new ShellString(JSON.stringify(output));
    const execStub = stubMethod(sandbox, shelljs, 'exec').yields(0, shellString, '');
    await execCmd(cmd, { async: true });
    expect(execStub.args[0][0]).to.equal(`${binPath} ${cmd}`);
  });

  it('should accept valid sfdx path in env var', async () => {
    const binPath = join('sfdx-cli', 'bin', 'sfdx');
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(shelljs, 'which').callsFake((x) => new ShellString(x));

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
    const binPath = join('bin', 'dev');
    try {
      await execCmd(cmd, { async: true });
      assert(false, 'Expected an error to be thrown');
    } catch (err: unknown) {
      expect((err as Error).message).to.equal(`Cannot find specified executable path: ${binPath}`);
    }
  });

  it('should throw an error when ensureExitCode does not match exit code', async () => {
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(shelljs, 'which').callsFake((x) => new ShellString(x));
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
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(shelljs, 'which').callsFake((x) => new ShellString(x));

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
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(shelljs, 'which').callsFake((x) => new ShellString(x));

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
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.stub(shelljs, 'which').callsFake((x) => new ShellString(x));

    const shellString = new ShellString('try JSON parsing this');
    stubMethod(sandbox, shelljs, 'exec').yields(0, shellString, '');

    const result = await execCmd(`${cmd} --json`, { async: true });
    expect(result).to.have.deep.property('shellOutput', shellString);
    expect(result).to.have.property('execCmdDuration');
    expect(result.execCmdDuration).to.be.instanceOf(Duration);
    expect(result.jsonOutput).to.deep.equal(undefined);
    expect(result.jsonError).to.be.an('Error');
    expect(result.jsonError?.name).to.equal('JsonParseError');
    expect(result.jsonError?.message).to.match(/Parse error in file unknown on line 1\n\r?try JSON parsing this/);
  });

  it('should override shell default', async () => {
    const shellOverride = 'powershell.exe';
    sandbox.stub(shelljs, 'which').callsFake((x) => new ShellString(x));

    stubMethod(sandbox, env, 'getString')
      .withArgs('TESTKIT_EXECUTABLE_PATH')
      .returns(null)
      .withArgs('TESTKIT_EXEC_SHELL')
      .returns(shellOverride);
    sandbox.stub(fs, 'existsSync').returns(true);
    const shellString = new ShellString(JSON.stringify(output));
    const execStub = stubMethod(sandbox, shelljs, 'exec').yields(0, shellString, '');
    await execCmd(cmd, { async: true });
    expect(execStub.args[0][1]).to.have.property('shell', shellOverride);
  });
});
describe('getWaitTime', () => {
  it('should return a the default timeout', () => {
    const waitTime = getWaitTime('foo');
    expect(waitTime).to.be.to.equal(Duration.minutes(30).milliseconds);
  });
  it('should return timeout of 5 minutes', () => {
    const waitTime = getWaitTime('foo --wait 5');
    expect(waitTime).to.be.to.equal(Duration.minutes(5).milliseconds);
  });
  it('should return timeout of 5 minutes with flag --wait=5', () => {
    const waitTime = getWaitTime('foo --wait 5');
    expect(waitTime).to.be.to.equal(Duration.minutes(5).milliseconds);
  });
  it('should throw with negative wait', () => {
    // eslint-disable-next-line no-unused-expressions
    expect(() => getWaitTime('foo --wait -42')).to.throw(
      /The given wait time on the command, "-42", cannot be negative./
    );
  });
  it('should return command wait using short flag -w 42', () => {
    const waitTime = getWaitTime('foo -w42');
    expect(waitTime).to.be.to.equal(Duration.minutes(42).milliseconds);
  });
  it('should return command wait using short flag -w=42', () => {
    const waitTime = getWaitTime('foo -w=42');
    expect(waitTime).to.be.to.equal(Duration.minutes(42).milliseconds);
  });
  it('should return command wait using short flag with lots of spaces -w                              42', () => {
    const waitTime = getWaitTime('foo -w                              42');
    expect(waitTime).to.be.to.equal(Duration.minutes(42).milliseconds);
  });
  it('should return command default wait when wait flag has no value -w', () => {
    const waitTime = getWaitTime('foo -w');
    expect(waitTime).to.be.to.equal(Duration.minutes(30).milliseconds);
  });
  it('should return timeout of 5 minutes when other parameters present', () => {
    const waitTime = getWaitTime('foo --baz --wait 5 --foo bar');
    expect(waitTime).to.be.to.equal(Duration.minutes(5).milliseconds);
  });
  it('should return timeout of 5 minutes when wait followed by numeric varargs', () => {
    const waitTime = getWaitTime('foo --baz --wait 5 123456');
    expect(waitTime).to.be.to.equal(Duration.minutes(5).milliseconds);
  });
  it('should return default timeout of 30 minutes when wait value is not numeric', () => {
    const waitTime = getWaitTime('foo --baz --wait forever');
    expect(waitTime).to.be.to.equal(Duration.minutes(30).milliseconds);
  });
});
