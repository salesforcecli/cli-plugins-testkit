/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { tmpdir } from 'os';
import { join as pathJoin } from 'path';
import { assert, expect } from 'chai';
import * as sinon from 'sinon';
import * as shelljs from 'shelljs';
import { ShellString } from 'shelljs';
import { stubMethod } from '@salesforce/ts-sinon';
import { env } from '@salesforce/kit';
import { fs as fsCore } from '@salesforce/core';
import { TestProject } from '../../lib/testProject';

describe('TestProject', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it('should create from a sourceDir', () => {
    const sourceDir = pathJoin('foo', 'bar');
    const destinationDir = pathJoin('barrel', 'aged');
    const shellString = new ShellString('');
    shellString.code = 0;
    const cpStub = stubMethod(sandbox, shelljs, 'cp').returns(shellString);
    const testProject = new TestProject({ sourceDir, destinationDir });
    expect(testProject.dir).to.equal(pathJoin(destinationDir, 'bar'));
    expect(cpStub.firstCall.args[0]).to.equal('-r');
    expect(cpStub.firstCall.args[1]).to.equal(sourceDir);
    expect(cpStub.firstCall.args[2]).to.equal(destinationDir);
  });

  it('should error if sourceDir copy fails', () => {
    const shellString = new ShellString('');
    shellString.code = 1;
    shellString.stderr = 'not enough coffee to copy';
    stubMethod(sandbox, shelljs, 'cp').returns(shellString);
    try {
      new TestProject({ sourceDir: 'foobar' });
      assert(false, 'TestProject should throw');
    } catch (err: unknown) {
      expect((err as Error).message).to.equal(`project copy failed with error:\n${shellString.stderr}`);
    }
  });

  it('should create from a gitClone', () => {
    const gitClone = 'https://github.com/testProj.git';
    const destinationDir = pathJoin('habanero', 'pirate');
    const cloneDir = 'ninjas';
    const shellString = new ShellString('');
    shellString.code = 0;
    const whichStub = stubMethod(sandbox, shelljs, 'which').returns('/usr/bin/git');
    const execStub = stubMethod(sandbox, shelljs, 'exec').returns(shellString);
    const readdirSyncStub = stubMethod(sandbox, fsCore, 'readdirSync').returns([cloneDir]);
    const testProject = new TestProject({ gitClone, destinationDir });
    expect(testProject.dir).to.equal(pathJoin(destinationDir, cloneDir));
    expect(whichStub.calledWith('git')).to.equal(true);
    expect(readdirSyncStub.calledWith(destinationDir)).to.equal(true);
    expect(execStub.firstCall.args[0]).to.equal(`git clone ${gitClone}`);
    expect(execStub.firstCall.args[1]).to.deep.equal({ cwd: destinationDir, silent: true });
  });

  it('should error if git clone fails', () => {
    const gitClone = 'https://github.com/testProj.git';
    const shellString = new ShellString('');
    shellString.code = 1;
    shellString.stderr = 'clone has a bad motivator';
    stubMethod(sandbox, shelljs, 'which').returns('/usr/bin/git');
    stubMethod(sandbox, shelljs, 'exec').returns(shellString);
    try {
      new TestProject({ gitClone });
      assert(false, 'TestProject should throw');
    } catch (err: unknown) {
      expect((err as Error).message).to.equal(`git clone failed with error:\n${shellString.stderr}`);
    }
  });

  it('should error if git not found', () => {
    const gitClone = 'https://github.com/testProj.git';
    stubMethod(sandbox, shelljs, 'which').returns(null);
    try {
      new TestProject({ gitClone });
      assert(false, 'TestProject should throw');
    } catch (err: unknown) {
      expect((err as Error).message).to.equal('git executable not found for creating a project from a git clone');
    }
  });

  it('should generate from a name', () => {
    stubMethod(sandbox, shelljs, 'which').returns(true);
    const shellOverride = 'powershell.exe';
    stubMethod(sandbox, env, 'getString').returns(shellOverride);
    const shellString = new ShellString('');
    shellString.code = 0;
    const execStub = stubMethod(sandbox, shelljs, 'exec').returns(shellString);
    const name = 'MyTestProject';
    const destinationDir = pathJoin('foo', 'bar');
    const testProject = new TestProject({ name, destinationDir });
    expect(testProject.dir).to.equal(pathJoin(destinationDir, name));
    const execArg1 = `sfdx force:project:create -n ${name} -d ${destinationDir}`;
    expect(execStub.firstCall.args[0]).to.equal(execArg1);
    expect(execStub.firstCall.args[1]).to.have.property('shell', shellOverride);
  });

  it('should generate by default', () => {
    stubMethod(sandbox, shelljs, 'which').returns(true);
    const shellString = new ShellString('');
    shellString.code = 0;
    const execStub = stubMethod(sandbox, shelljs, 'exec').returns(shellString);
    const testProject = new TestProject({});
    const expectedPath = pathJoin(tmpdir(), 'project_');
    expect(testProject.dir.startsWith(expectedPath)).to.equal(true);
    const execArg1 = 'sfdx force:project:create -n project_';
    expect(execStub.firstCall.args[0]).to.include(execArg1);
    expect(execStub.firstCall.args[0]).to.include(`-d ${tmpdir()}`);
  });

  it('should error if project:create fails', () => {
    stubMethod(sandbox, shelljs, 'which').returns(true);
    const shellString = new ShellString('');
    shellString.code = 1;
    shellString.stderr = 'project:create failed';
    stubMethod(sandbox, shelljs, 'exec').returns(shellString);
    try {
      new TestProject({});
      assert(false, 'TestProject should throw');
    } catch (err: unknown) {
      expect((err as Error).message).to.equal(`force:project:create failed with error:\n${shellString.stderr}`);
    }
  });

  it('should error if sfdx not found', () => {
    stubMethod(sandbox, shelljs, 'which').returns(null);
    const name = 'MyTestProject';
    const destinationDir = pathJoin('foo', 'bar');
    try {
      new TestProject({ name, destinationDir });
      assert(false, 'TestProject should throw');
    } catch (err: unknown) {
      expect((err as Error).message).to.equal(
        'sfdx executable not found for creating a project using force:project:create command'
      );
    }
  });

  it('should zip project contents with defaults', async () => {
    stubMethod(sandbox, shelljs, 'which').returns(true);
    const expectedRv = 'zip_test';
    const shellString = new ShellString('');
    shellString.code = 0;
    stubMethod(sandbox, shelljs, 'exec').returns(shellString);
    const name = 'ZippityDoo';
    const destinationDir = pathJoin('coffee', 'mug');
    const testProject = new TestProject({ name, destinationDir });
    const zipDirStub = stubMethod(sandbox, testProject, 'zipDir').resolves(expectedRv);
    const rv = await testProject.zip();
    expect(rv).to.equal(expectedRv);
    expect(zipDirStub.firstCall.args[0]).to.deep.equal({
      name: `${name}.zip`,
      sourceDir: pathJoin(destinationDir, name),
      destDir: destinationDir,
    });
  });

  it('should zip project contents with params', async () => {
    stubMethod(sandbox, shelljs, 'which').returns(true);
    const expectedRv = 'zip_test';
    const shellString = new ShellString('');
    shellString.code = 0;
    stubMethod(sandbox, shelljs, 'exec').returns(shellString);
    const name = 'ZippityDooTake2';
    const zipFileName = 'pancakes.zip';
    const zipFileDestDir = pathJoin('nuts', 'and', 'gum');
    const destinationDir = pathJoin('coffee', 'mug');
    const testProject = new TestProject({ name, destinationDir });
    const zipDirStub = stubMethod(sandbox, testProject, 'zipDir').resolves(expectedRv);
    const rv = await testProject.zip(zipFileName, zipFileDestDir);
    expect(rv).to.equal(expectedRv);
    expect(zipDirStub.firstCall.args[0]).to.deep.equal({
      name: zipFileName,
      sourceDir: pathJoin(destinationDir, name),
      destDir: zipFileDestDir,
    });
  });
});
