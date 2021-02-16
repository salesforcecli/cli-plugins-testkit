/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { assert, expect } from 'chai';
import * as sinon from 'sinon';
import * as shelljs from 'shelljs';
import { ShellString } from 'shelljs';
import { stubMethod } from '@salesforce/ts-sinon';
import { fs as fsCore } from '@salesforce/core';
import { env } from '@salesforce/kit';
import { TestSession } from '../../lib/testSession';
import { TestProject } from '../../lib/testProject';

describe('TestSession', () => {
  const sandbox = sinon.createSandbox();
  const cwd = path.join('magically', 'delicious');
  const optionsFileName = 'testSessionOptions.json';

  let mkdirpStub: sinon.SinonStub;
  let writeJsonStub: sinon.SinonStub;

  beforeEach(() => {
    mkdirpStub = stubMethod(sandbox, fsCore, 'mkdirpSync');
    writeJsonStub = stubMethod(sandbox, fsCore, 'writeJsonSync');
    stubMethod(sandbox, process, 'cwd').returns(cwd);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('create', () => {
    it('should create a session with no options', () => {
      const session = TestSession.create();

      expect(mkdirpStub.calledWith(session.dir)).to.equal(true);
      expect(writeJsonStub.firstCall.args[0]).to.equal(path.join(session.dir, optionsFileName));
      expect(session.id).to.be.a('string');
      expect(session.createdDate).to.be.a('Date');
      expect(session.dir).to.equal(path.join(cwd, `test_session_${session.id}`));
      expect(session.homeDir).to.equal(session.dir);
      expect(session.project).to.equal(undefined);
      expect(session.setup).to.equal(undefined);
      expect(process.env.HOME).to.equal(session.homeDir);
    });

    it('should create a session with a project', () => {
      const testProjName = 'testSessionProj1';
      const sourceDir = path.join(cwd, testProjName);
      const shellString = new ShellString('');
      shellString.code = 0;
      stubMethod(sandbox, shelljs, 'cp').returns(shellString);
      const cwdStub = stubMethod(sandbox, TestSession.prototype, 'stubCwd');

      const session = TestSession.create({ project: { sourceDir } });

      expect(mkdirpStub.calledWith(session.dir)).to.equal(true);
      expect(writeJsonStub.firstCall.args[0]).to.equal(path.join(session.dir, optionsFileName));
      expect(session.id).to.be.a('string');
      expect(session.createdDate).to.be.a('Date');
      expect(session.dir).to.equal(path.join(cwd, `test_session_${session.id}`));
      expect(session.homeDir).to.equal(session.dir);
      expect(session.project).to.be.instanceOf(TestProject);
      expect(session.project?.dir).to.equal(path.join(session.dir, testProjName));
      expect(cwdStub.firstCall.args[0]).to.equal(session.project?.dir);
      expect(session.setup).to.equal(undefined);
      expect(process.env.HOME).to.equal(session.homeDir);
    });

    it('should create a session with setup commands', () => {
      const setupCommands = ['sfdx foo:bar -r testing'];
      const execRv = { result: { donuts: 'yum' } };
      const shellString = new ShellString(JSON.stringify(execRv));
      shellString.code = 0;
      const execStub = stubMethod(sandbox, shelljs, 'exec').returns(shellString);

      const session = TestSession.create({ setupCommands });

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
    });

    it('should error if setup command fails', () => {
      const setupCommands = ['sfdx foo:bar -r testing'];
      const expectedCmd = `${setupCommands[0]} --json`;
      const execRv = 'Cannot foo before bar';
      const shellString = new ShellString(JSON.stringify(execRv));
      shellString.code = 1;
      stubMethod(sandbox, shelljs, 'exec').returns(shellString);

      try {
        TestSession.create({ setupCommands });
        assert(false, 'TestSession.create() should throw');
      } catch (err: unknown) {
        expect((err as Error).message).to.equal(`Setup command ${expectedCmd} failed due to: ${shellString.stdout}`);
      }
    });
  });

  describe('clean', () => {
    it('should remove the test session dir', async () => {
      const shellString = new ShellString(JSON.stringify(''));
      shellString.code = 0;
      const execStub = stubMethod(sandbox, shelljs, 'exec');
      const rmStub = stubMethod(sandbox, shelljs, 'rm').returns(shellString);
      const session = TestSession.create();
      stubMethod(sandbox, session, 'sleep').resolves();

      await session.clean();

      expect(execStub.called, 'should not have tried to delete TestSession orgs').to.equal(false);
      expect(rmStub.firstCall.args[0]).to.equal('-rf');
      expect(rmStub.firstCall.args[1]).to.equal(session.dir);
    });
  });

  describe('zip', () => {
    it('should zip session contents with defaults', async () => {
      const expectedRv = 'zip_test';
      const shellString = new ShellString('');
      shellString.code = 0;
      stubMethod(sandbox, env, 'getBoolean').returns(true);

      const session = TestSession.create();
      const zipDirStub = stubMethod(sandbox, session, 'zipDir').resolves(expectedRv);
      const rv = await session.zip();

      expect(rv).to.equal(expectedRv);
      expect(zipDirStub.firstCall.args[0]).to.deep.equal({
        name: `${path.basename(session.dir)}.zip`,
        sourceDir: session.dir,
        destDir: path.dirname(session.dir),
      });
    });
  });
});
