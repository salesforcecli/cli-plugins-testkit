/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// For testing private properties of TestSession
/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as fs from 'fs';
import * as path from 'path';
import { assert, expect } from 'chai';
import * as sinon from 'sinon';
import * as shelljs from 'shelljs';
import { ShellString } from 'shelljs';
import { spyMethod, stubMethod } from '@salesforce/ts-sinon';
import { env } from '@salesforce/kit';
import Sinon = require('sinon');
import { TestSession } from '../../src/testSession';
import { TestProject } from '../../src/testProject';

describe('TestSession', () => {
  const sandbox = sinon.createSandbox();
  const cwd = path.join('magically', 'delicious');
  const optionsFileName = 'testSessionOptions.json';

  let mkdirpStub: sinon.SinonStub;
  let writeJsonStub: sinon.SinonStub;
  let cwdStub: sinon.SinonStub;

  beforeEach(() => {
    mkdirpStub = stubMethod(sandbox, fs, 'mkdirSync');
    writeJsonStub = stubMethod(sandbox, fs, 'writeFileSync');
    cwdStub = stubMethod(sandbox, process, 'cwd').returns(cwd);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('create', () => {
    it('should create a session with no options', async () => {
      const session = await TestSession.create();

      expect(mkdirpStub.calledWith(session.dir)).to.equal(true);
      expect(writeJsonStub.firstCall.args[0]).to.equal(path.join(session.dir, optionsFileName));
      expect(session.id).to.be.a('string');
      expect(session.createdDate).to.be.a('Date');
      expect(session.dir).to.equal(path.join(cwd, `test_session_${session.id}`));
      expect(session.homeDir).to.equal(session.dir);
      expect(session.project).to.equal(undefined);
      expect(session.setup).to.equal(undefined);
      expect(process.env.HOME).to.equal(session.homeDir);
      expect(process.env.USERPROFILE).to.equal(session.homeDir);
    });

    it('should create a session with specific dir', async () => {
      const sessionDir = path.join('some', 'other', 'path');
      const session = await TestSession.create({ sessionDir });

      expect(mkdirpStub.calledWith(session.dir)).to.equal(true);
      expect(writeJsonStub.firstCall.args[0]).to.equal(path.join(session.dir, optionsFileName));
      expect(session.id).to.be.a('string');
      expect(session.createdDate).to.be.a('Date');
      expect(session.dir).to.equal(sessionDir);
      expect(session.homeDir).to.equal(session.dir);
      expect(session.project).to.equal(undefined);
      expect(session.setup).to.equal(undefined);
      expect(process.env.HOME).to.equal(session.homeDir);
      expect(process.env.USERPROFILE).to.equal(session.homeDir);
    });

    it('should create a session with specific dir and homedir from env', async () => {
      const sessionDir = path.join('another', 'path');
      const homedir = path.join('some', 'other', 'home');
      stubMethod(sandbox, env, 'getString')
        .withArgs('TESTKIT_SESSION_DIR')
        .returns(sessionDir)
        .withArgs('TESTKIT_HOMEDIR', sessionDir)
        .returns(homedir);
      const session = await TestSession.create({ sessionDir });

      expect(mkdirpStub.calledWith(session.dir)).to.equal(true);
      expect(writeJsonStub.firstCall.args[0]).to.equal(path.join(session.dir, optionsFileName));
      expect(session.id).to.be.a('string');
      expect(session.createdDate).to.be.a('Date');
      expect(session.dir).to.equal(sessionDir);
      expect(session.homeDir).to.equal(homedir);
      expect(session.project).to.equal(undefined);
      expect(session.setup).to.equal(undefined);
      expect(process.env.HOME).to.equal(session.homeDir);
      expect(process.env.USERPROFILE).to.equal(session.homeDir);
    });

    it('should create a session with a project', async () => {
      const testProjName = 'testSessionProj1';
      const sourceDir = path.join(cwd, testProjName);
      const shellString = new ShellString('');
      shellString.code = 0;
      stubMethod(sandbox, shelljs, 'cp').returns(shellString);
      const stubCwdStub = stubMethod(sandbox, TestSession.prototype, 'stubCwd');

      const session = await TestSession.create({ project: { sourceDir } });

      expect(mkdirpStub.calledWith(session.dir)).to.equal(true);
      expect(writeJsonStub.firstCall.args[0]).to.equal(path.join(session.dir, optionsFileName));
      expect(session.id).to.be.a('string');
      expect(session.createdDate).to.be.a('Date');
      expect(session.dir).to.equal(path.join(cwd, `test_session_${session.id}`));
      expect(session.homeDir).to.equal(session.dir);
      expect(session.project).to.be.instanceOf(TestProject);
      expect(session.project?.dir).to.equal(path.join(session.dir, testProjName));
      expect(stubCwdStub.firstCall.args[0]).to.equal(session.project?.dir);
      expect(session.setup).to.equal(undefined);
      expect(process.env.HOME).to.equal(session.homeDir);
      expect(process.env.USERPROFILE).to.equal(session.homeDir);
    });

    it('should use an existing project', async () => {
      const projectDir = path.join('existing', 'project', 'path');
      const homedir = path.join('some', 'other', 'home');
      stubMethod(sandbox, env, 'getString')
        .withArgs('TESTKIT_PROJECT_DIR')
        .returns(projectDir)
        .withArgs('TESTKIT_HOMEDIR')
        .returns(homedir);
      const testProjName = 'testSessionProj1';
      const sourceDir = path.join(cwd, testProjName);
      const shellString = new ShellString('');
      shellString.code = 0;
      stubMethod(sandbox, shelljs, 'cp').returns(shellString);
      const stubCwdStub = stubMethod(sandbox, TestSession.prototype, 'stubCwd');

      const session = await TestSession.create({ project: { sourceDir } });

      expect(mkdirpStub.calledWith(session.dir)).to.equal(true);
      expect(writeJsonStub.firstCall.args[0]).to.equal(path.join(session.dir, optionsFileName));
      expect(session.id).to.be.a('string');
      expect(session.createdDate).to.be.a('Date');
      expect(session.dir).to.equal(path.join(cwd, `test_session_${session.id}`));
      expect(session.homeDir).to.equal(homedir);
      expect(session.project).to.equal(undefined);
      expect(stubCwdStub.firstCall.args[0]).to.equal(projectDir);
      expect(session.setup).to.equal(undefined);
      expect(process.env.HOME).to.equal(session.homeDir);
      expect(process.env.USERPROFILE).to.equal(session.homeDir);
    });

    it('should create a session with setup commands', async () => {
      stubMethod(sandbox, shelljs, 'which').returns(true);
      const homedir = path.join('some', 'other', 'home');
      const shellOverride = 'powershell.exe';
      stubMethod(sandbox, env, 'getString')
        .withArgs('TESTKIT_EXEC_SHELL')
        .returns(shellOverride)
        .withArgs('TESTKIT_HOMEDIR')
        .returns(homedir);
      const setupCommands = ['sfdx foo:bar -r testing'];
      const execRv = { result: { donuts: 'yum' } };
      const shellString = new ShellString(JSON.stringify(execRv));
      shellString.code = 0;
      const execStub = stubMethod(sandbox, shelljs, 'exec').returns(shellString);

      const session = await TestSession.create({ setupCommands });

      expect(mkdirpStub.calledWith(session.dir)).to.equal(true);
      expect(writeJsonStub.firstCall.args[0]).to.equal(path.join(session.dir, optionsFileName));
      expect(session.id).to.be.a('string');
      expect(session.createdDate).to.be.a('Date');
      expect(session.dir).to.equal(path.join(cwd, `test_session_${session.id}`));
      expect(session.homeDir).to.equal(homedir);
      expect(session.project).to.equal(undefined);
      expect(session.setup).to.deep.equal([execRv]);
      expect(execStub.firstCall.args[0]).to.equal(`${setupCommands[0]} --json`);
      expect(execStub.firstCall.args[1]).to.have.property('shell', shellOverride);
      expect(process.env.HOME).to.equal(session.homeDir);
      expect(process.env.USERPROFILE).to.equal(session.homeDir);
    });

    it('should create a session with setup commands and retries', async () => {
      stubMethod(sandbox, shelljs, 'which').returns(true);
      // set retry timeout to 0 ms so that the test runs quickly
      process.env.TESTKIT_SETUP_RETRIES_TIMEOUT = '0';
      const retries = 2;
      const setupCommands = ['sfdx foo:bar -r testing'];
      const execRv = { result: { donuts: 'yum' } };
      const execStub = stubMethod(sandbox, shelljs, 'exec')
        .onCall(retries)
        .callsFake(() => {
          const shellString = new ShellString(JSON.stringify(execRv));
          shellString.code = 0;
          return shellString;
        })
        .callsFake(() => {
          const shellString = new ShellString(JSON.stringify(execRv));
          shellString.code = 1;
          return shellString;
        });
      const sleepSpy = spyMethod(sandbox, TestSession.prototype, 'sleep');
      const session = await TestSession.create({ setupCommands, retries });
      // expect sleepSync to be called before every retry attempt
      expect(sleepSpy.callCount).to.equal(retries);
      // expect exec to be called on every retry attempt AND the initial attempt
      expect(execStub.callCount).to.equal(setupCommands.length * (retries + 1));
      expect(session.setup).to.deep.equal([execRv]);
      expect(execStub.firstCall.args[0]).to.equal(`${setupCommands[0]} --json`);
    });

    it('should create a session with org creation setup commands', async () => {
      stubMethod(sandbox, shelljs, 'which').returns(true);
      const setupCommands = ['sfdx org:create -f config/project-scratch-def.json'];
      const username = 'hey@ho.org';
      const execRv = { result: { username } };
      const shellString = new ShellString(JSON.stringify(execRv));
      shellString.code = 0;
      const execStub = stubMethod(sandbox, shelljs, 'exec').returns(shellString);

      const session = await TestSession.create({ setupCommands });

      expect(mkdirpStub.calledWith(session.dir)).to.equal(true);
      expect(writeJsonStub.firstCall.args[0]).to.equal(path.join(session.dir, optionsFileName));
      expect(session.id).to.be.a('string');
      expect(session.createdDate).to.be.a('Date');
      expect(session.dir).to.equal(path.join(cwd, `test_session_${session.id}`));
      expect(session.homeDir).to.equal(session.dir);
      expect(session.project).to.equal(undefined);
      expect(session.setup).to.deep.equal([execRv]);
      expect(execStub.firstCall.args[0]).to.equal(`${setupCommands[0]} --json`);
      expect(process.env.HOME).to.equal(session.homeDir);
      expect(process.env.USERPROFILE).to.equal(session.homeDir);

      // @ts-ignore session.orgs is private
      expect(session.orgs).to.deep.equal([username]);
    });

    it('should create a session without org creation if TESTKIT_ORG_USERNAME is defined', async () => {
      stubMethod(sandbox, shelljs, 'which').returns(true);
      const overriddenUsername = 'sherpa@tyrolean.org';
      const homedir = path.join('some', 'other', 'home');
      stubMethod(sandbox, env, 'getString')
        .withArgs('TESTKIT_ORG_USERNAME')
        .returns(overriddenUsername)
        .withArgs('TESTKIT_HOMEDIR')
        .returns(homedir);
      const username = 'hey@ho.org';
      const setupCommands = ['sfdx org:create -f config/project-scratch-def.json'];
      const execRv = { result: { username } };
      const shellString = new ShellString(JSON.stringify(execRv));
      shellString.code = 0;
      const execStub = stubMethod(sandbox, shelljs, 'exec').returns(shellString);

      const session = await TestSession.create({ setupCommands });

      expect(mkdirpStub.calledWith(session.dir)).to.equal(true);
      expect(writeJsonStub.firstCall.args[0]).to.equal(path.join(session.dir, optionsFileName));
      expect(session.id).to.be.a('string');
      expect(session.createdDate).to.be.a('Date');
      expect(session.dir).to.equal(path.join(cwd, `test_session_${session.id}`));
      expect(session.homeDir).to.equal(homedir);
      expect(session.project).to.equal(undefined);
      expect(session.setup).to.deep.equal([{ result: { username: overriddenUsername } }]);
      expect(execStub.called).to.equal(false);
      expect(process.env.HOME).to.equal(session.homeDir);
      expect(process.env.USERPROFILE).to.equal(session.homeDir);

      // @ts-ignore session.orgs is private
      expect(session.orgs).to.deep.equal([]);
    });

    it('should error if setup command fails', async () => {
      stubMethod(sandbox, shelljs, 'which').returns(true);
      const setupCommands = ['sfdx foo:bar -r testing'];
      const expectedCmd = `${setupCommands[0]} --json`;
      const execRv = 'Cannot foo before bar';
      const shellString = new ShellString(JSON.stringify(execRv));
      shellString.code = 1;
      stubMethod(sandbox, shelljs, 'exec').returns(shellString);

      try {
        await TestSession.create({ setupCommands });
        assert(false, 'TestSession.create() should throw');
      } catch (err: unknown) {
        expect((err as Error).message).to.equal(`Setup command ${expectedCmd} failed due to: ${shellString.stdout}`);
      }
    });

    it('should error if sfdx not found to run setup commands', async () => {
      stubMethod(sandbox, shelljs, 'which').returns(null);
      const setupCommands = ['sfdx foo:bar -r testing'];
      const execRv = 'Cannot foo before bar';
      const shellString = new ShellString(JSON.stringify(execRv));
      shellString.code = 1;
      stubMethod(sandbox, shelljs, 'exec').returns(shellString);

      try {
        await TestSession.create({ setupCommands });
        assert(false, 'TestSession.create() should throw');
      } catch (err: unknown) {
        expect((err as Error).message).to.equal('sfdx executable not found for running sfdx setup commands');
      }
    });
  });

  describe('clean', () => {
    let execStub: Sinon.SinonStub;
    let rmStub: Sinon.SinonStub;
    let restoreSpy: Sinon.SinonSpy;
    let session: TestSession;
    let shellString: ShellString;
    const rmOptions = { recursive: true, force: true, maxRetries: 100, retryDelay: 2000 };

    beforeEach(async () => {
      shellString = new ShellString(JSON.stringify(''));
      shellString.code = 0;
      execStub = stubMethod(sandbox, shelljs, 'exec');
      rmStub = stubMethod(sandbox, fs.promises, 'rm');
      session = await TestSession.create();
      stubMethod(sandbox, session, 'sleep').resolves();
      // @ts-ignore session.sandbox is private
      restoreSpy = spyMethod(sandbox, session.sandbox, 'restore');
    });

    it('should remove the test session dir', async () => {
      rmStub.returns(shellString);
      await session.clean();

      expect(restoreSpy.called).to.equal(true);
      expect(execStub.called, 'should not have tried to delete TestSession orgs').to.equal(false);
      expect(rmStub.firstCall.args[0]).to.equal(session.dir);
      expect(rmStub.firstCall.args[1]).to.deep.equal(rmOptions);
    });

    it('should not remove the test session dir or orgs when TESTKIT_SAVE_ARTIFACTS === true', async () => {
      stubMethod(sandbox, env, 'getBoolean').returns(true);

      await session.clean();

      expect(restoreSpy.called).to.equal(true);
      expect(execStub.called, 'should not have tried to delete TestSession orgs').to.equal(false);
      expect(rmStub.called, 'should not have tried to rm TestSession dir').to.equal(false);
    });

    it('should remove orgs created by setupCommands', async () => {
      execStub.returns(shellString);
      rmStub.returns(shellString);
      const username = 'me@my.org';
      // @ts-ignore
      session.orgs = [username];

      await session.clean();

      expect(restoreSpy.called).to.equal(true);
      expect(execStub.firstCall.args[0]).to.equal(`sfdx force:org:delete -u ${username} -p`);
      expect(rmStub.firstCall.args[0]).to.equal(session.dir);
      expect(rmStub.firstCall.args[1]).to.deep.equal(rmOptions);
    });

    it('should not remove orgs when TESTKIT_ORG_USERNAME === true', async () => {
      stubMethod(sandbox, env, 'getString').returns('me@my.org');
      rmStub.returns(shellString);

      await session.clean();

      expect(restoreSpy.called).to.equal(true);
      expect(execStub.called).to.equal(false);
      expect(rmStub.firstCall.args[0]).to.equal(session.dir);
      expect(rmStub.firstCall.args[1]).to.deep.equal(rmOptions);
    });

    it('should not remove the test session dir when overridden', async () => {
      // @ts-ignore
      session.overriddenDir = 'overriden';

      await session.clean();

      expect(restoreSpy.called).to.equal(true);
      expect(execStub.called, 'should not have tried to delete TestSession orgs').to.equal(false);
      expect(rmStub.called, 'should not have tried to rm TestSession dir').to.equal(false);
    });

    it('should throw when org delete fails', async () => {
      rmStub.returns(shellString);
      const execShellString = new ShellString(JSON.stringify(''));
      execShellString.code = 1;
      execShellString.stderr = 'does not look';
      execStub.returns(execShellString);

      const username = 'me@my.org';
      // @ts-ignore
      session.orgs = [username];

      try {
        await session.clean();
      } catch (err: unknown) {
        expect(restoreSpy.called).to.equal(true);
        expect(rmStub.firstCall.args[0]).to.equal(session.dir);
        expect(rmStub.firstCall.args[1]).to.deep.equal(rmOptions);
        const msg = `Deleting org ${username} failed due to: ${execShellString.stderr}`;
        expect((err as Error).message).to.equal(msg);
      }
    });
  });

  describe('stubCwd', () => {
    it('should stub process.cwd to the provided dir', async () => {
      cwdStub.restore();
      const session = await TestSession.create();
      const cwdDir = path.join('climb', 'to', 'safety');
      session.stubCwd(cwdDir);
      expect(process.cwd()).to.equal(cwdDir);
    });
  });

  describe('zip', () => {
    it('should zip session contents with defaults', async () => {
      const expectedRv = 'zip_test';
      const shellString = new ShellString('');
      shellString.code = 0;
      stubMethod(sandbox, env, 'getBoolean').returns(true);

      const session = await TestSession.create();
      const zipDirStub = stubMethod(sandbox, session, 'zipDir').resolves(expectedRv);
      const rv = await session.zip();

      expect(rv).to.equal(expectedRv);
      expect(zipDirStub.firstCall.args[0]).to.deep.equal({
        name: `${path.basename(session.dir)}.zip`,
        sourceDir: session.dir,
        destDir: path.dirname(session.dir),
      });
    });

    it('should zip session contents with overrides', async () => {
      const zipFileName = 'zipitup.zip';
      const destDir = path.join('giant', 'bonzai', 'farm');
      const expectedRv = 'zip_test';
      const shellString = new ShellString('');
      shellString.code = 0;
      stubMethod(sandbox, env, 'getBoolean').returns(true);

      const session = await TestSession.create();
      const zipDirStub = stubMethod(sandbox, session, 'zipDir').resolves(expectedRv);
      const rv = await session.zip(zipFileName, destDir);

      expect(rv).to.equal(expectedRv);
      expect(zipDirStub.firstCall.args[0]).to.deep.equal({
        name: zipFileName,
        sourceDir: session.dir,
        destDir,
      });
    });

    it('should not zip session when TESTKIT_ENABLE_ZIP !== true', async () => {
      stubMethod(sandbox, env, 'getBoolean').returns(false);
      const session = await TestSession.create();
      const zipDirStub = stubMethod(sandbox, session, 'zipDir');

      const rv = await session.zip();

      expect(rv).to.equal(undefined);
      expect(zipDirStub.called).to.equal(false);
    });
  });
});
