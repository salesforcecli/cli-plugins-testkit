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
import { AuthFields } from '@salesforce/core';
import { ScratchOrgConfig, TestSession, rmOptions } from '../../src/testSession';
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
      expect(session.orgs.size).to.equal(0);
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
      expect(session.orgs.size).to.equal(0);
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
      expect(session.orgs.size).to.equal(0);
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
      expect(session.orgs.size).to.equal(0);
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
      expect(session.orgs.size).to.equal(0);
      expect(process.env.HOME).to.equal(session.homeDir);
      expect(process.env.USERPROFILE).to.equal(session.homeDir);
    });

    it('should create a session with scratch orgs and retries', async () => {
      stubMethod(sandbox, shelljs, 'which').returns(true);
      // set retry timeout to 0 ms so that the test runs quickly
      process.env.TESTKIT_SETUP_RETRIES_TIMEOUT = '0';
      const retries = 2;
      const username = 'hey@ho.org';
      const execRv = { result: { username, authFields: { username, orgId: '12345' } } };
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

      const scratchOrgs = [{ executable: 'sf', config: 'config/project-scratch-def.json' }] as ScratchOrgConfig[];

      const session = await TestSession.create({
        scratchOrgs,
        retries,
      });
      // expect sleepSync to be called before every retry attempt
      expect(sleepSpy.callCount).to.equal(retries);
      // expect exec to be called on every retry attempt AND the initial attempt
      expect(execStub.callCount).to.equal(scratchOrgs.length * (retries + 1));
      expect(session.orgs.get(username)).to.deep.equal({ username, orgId: '12345' });
      expect(execStub.firstCall.args[0]).to.equal(
        'sf env:create:scratch --json -y 1 -w 60 -f config/project-scratch-def.json'
      );
    });

    it('should create a session with org creation', async () => {
      stubMethod(sandbox, shelljs, 'which').returns(true);
      const username = 'hey@ho.org';
      const execRv = { result: { username, authFields: { username, orgId: '12345' } } };
      const shellString = new ShellString(JSON.stringify(execRv));
      shellString.code = 0;
      const execStub = stubMethod(sandbox, shelljs, 'exec').returns(shellString);

      const session = await TestSession.create({
        scratchOrgs: [
          {
            executable: 'sf',
            config: 'config/project-scratch-def.json',
            alias: 'my-org',
            setDefault: true,
            duration: 1,
            edition: 'developer',
          },
        ],
      });

      expect(mkdirpStub.calledWith(session.dir)).to.equal(true);
      expect(writeJsonStub.firstCall.args[0]).to.equal(path.join(session.dir, optionsFileName));
      expect(session.id).to.be.a('string');
      expect(session.createdDate).to.be.a('Date');
      expect(session.dir).to.equal(path.join(cwd, `test_session_${session.id}`));
      expect(session.homeDir).to.equal(session.dir);
      expect(session.project).to.equal(undefined);
      expect(session.orgs.get(username)).to.deep.equal({ username, orgId: '12345' });
      expect(session.orgs.get('default')).to.deep.equal({ username, orgId: '12345' });
      expect(execStub.firstCall.args[0]).to.equal(
        'sf env:create:scratch --json -y 1 -w 60 -f config/project-scratch-def.json -a my-org -d -e developer'
      );
      expect(process.env.HOME).to.equal(session.homeDir);
      expect(process.env.USERPROFILE).to.equal(session.homeDir);
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

      const execRv = { result: { username, orgId: '12345' } };
      const shellString = new ShellString(JSON.stringify(execRv));
      shellString.code = 0;
      const execStub = stubMethod(sandbox, shelljs, 'exec').returns(shellString);

      const session = await TestSession.create({
        scratchOrgs: [{ executable: 'sfdx', config: 'config/project-scratch-def.json' }],
      });

      expect(mkdirpStub.calledWith(session.dir)).to.equal(true);
      expect(writeJsonStub.firstCall.args[0]).to.equal(path.join(session.dir, optionsFileName));
      expect(session.id).to.be.a('string');
      expect(session.createdDate).to.be.a('Date');
      expect(session.dir).to.equal(path.join(cwd, `test_session_${session.id}`));
      expect(session.homeDir).to.equal(homedir);
      expect(session.project).to.equal(undefined);
      expect(session.orgs.get(overriddenUsername)).to.deep.equal({ username: overriddenUsername });
      expect(execStub.called).to.equal(false);
      expect(process.env.HOME).to.equal(session.homeDir);
      expect(process.env.USERPROFILE).to.equal(session.homeDir);
    });

    it('should error if setup command fails', async () => {
      stubMethod(sandbox, shelljs, 'which').returns(true);
      const expectedCmd = 'sf env:create:scratch --json -y 1 -w 60 -f config/project-scratch-def.json';
      const execRv = 'Cannot foo before bar';
      const shellString = new ShellString(JSON.stringify(execRv));
      shellString.code = 1;
      stubMethod(sandbox, shelljs, 'exec').returns(shellString);

      try {
        await TestSession.create({
          scratchOrgs: [{ executable: 'sf', config: 'config/project-scratch-def.json' }],
        });
        assert(false, 'TestSession.create() should throw');
      } catch (err: unknown) {
        expect((err as Error).message).to.equal(`${expectedCmd} failed due to: ${shellString.stdout}`);
      }
    });

    it('should error if sfdx not found to run setup commands', async () => {
      stubMethod(sandbox, shelljs, 'which').returns(null);
      const execRv = 'Cannot foo before bar';
      const shellString = new ShellString(JSON.stringify(execRv));
      shellString.code = 1;
      stubMethod(sandbox, shelljs, 'exec').returns(shellString);

      try {
        await TestSession.create({
          scratchOrgs: [{ executable: 'sf', config: 'config/project-scratch-def.json' }],
        });
        assert(false, 'TestSession.create() should throw');
      } catch (err: unknown) {
        expect((err as Error).message).to.equal('sf executable not found for creating scratch orgs');
      }
    });
  });

  describe('clean', () => {
    let execStub: Sinon.SinonStub;
    let rmStub: Sinon.SinonStub;
    let restoreSpy: Sinon.SinonSpy;
    let session: TestSession;
    let shellString: ShellString;

    beforeEach(async () => {
      shellString = new ShellString(JSON.stringify(''));
      shellString.code = 0;
      execStub = stubMethod(sandbox, shelljs, 'exec');
      rmStub = stubMethod(sandbox, fs.promises, 'rm');
      session = await TestSession.create();
      stubMethod(sandbox, session, 'sleep').resolves();
      // @ts-ignore session.sandbox is private
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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

      session.orgs = new Map<string, AuthFields>().set(username, { username, orgId: '12345' });

      await session.clean();

      expect(restoreSpy.called).to.equal(true);
      expect(execStub.firstCall.args[0]).to.equal(`sf org:delete:scratch -o ${username} -p`);
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
      session.overriddenDir = 'overridden';

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
