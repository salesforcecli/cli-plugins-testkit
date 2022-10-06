/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable arrow-body-style */

/*
 * NOTE on chosen file name for these tests. When this test runs before testSession.test.ts
 * a number of the testSession fail. Running these tests after testSession tests seems to work,
 * so chose a file name that guarantees these will be run last.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { stubMethod } from '@salesforce/ts-sinon';
import * as chai from 'chai';
import { AuthFields } from '@salesforce/core';
import { Env, env } from '@salesforce/kit';
import * as sinon from 'sinon';
import * as shell from 'shelljs';
import { prepareForAuthUrl, prepareForJwt, transferExistingAuthToEnv } from '../../src/hubAuth';

const { expect } = chai;
const tmp = os.tmpdir();
type SampleData = {
  jwtKeyWithHeaderFooter: string;
  jwtKeyWithOutHeaderFooter: string;
  devHubUsername: string;
  clientId: string;
  sfdxAuthUrl: string;
  accessToken: string;
  instanceUrl: string;
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sampleAuthData = require(path.join(__dirname, 'sample.auth.data.json')) as SampleData;

const authFields: AuthFields = {
  privateKey: '/some/private/key',
  instanceUrl: sampleAuthData.instanceUrl,
  username: sampleAuthData.devHubUsername,
  clientId: sampleAuthData.clientId,
};

let getStringStub: sinon.SinonStub;

describe('hubAuth', () => {
  const sandbox = sinon.createSandbox();
  type EnvVar = { key: string; value: string };
  let homeDir: string;
  let writeStub: sinon.SinonStub;
  const stubEnvGet = (envVars: EnvVar[]): void => {
    getStringStub = stubMethod(sandbox, Env.prototype, 'getString');
    for (const envVar of envVars) {
      getStringStub = getStringStub.withArgs(envVar.key).returns(envVar.value);
    }
  };
  beforeEach(() => {
    homeDir = `${path.join(tmp, path.sep)}${new Date().getTime()}`;
    stubMethod(sandbox, fs, 'mkdir');
    writeStub = stubMethod(sandbox, fs, 'writeFileSync');
    stubMethod(sandbox, process, 'cwd').returns(homeDir);
  });
  afterEach(() => {
    sandbox.restore();
  });
  describe('Prepare For Jwt', () => {
    it('should prepare test env for use with jwt auth that contains header/footer', () => {
      stubEnvGet([
        { key: 'TESTKIT_JWT_KEY', value: sampleAuthData.jwtKeyWithHeaderFooter },
        { key: 'TESTKIT_JWT_CLIENT_ID', value: sampleAuthData.clientId },
        { key: 'TESTKIT_HUB_USERNAME', value: sampleAuthData.devHubUsername },
        { key: 'TESTKIT_HUB_INSTANCE', value: sampleAuthData.instanceUrl },
      ]);

      writeStub.callsFake((): void => {
        return;
      });
      stubMethod(sandbox, fs, 'existsSync').callsFake((): boolean => true);
      const readStub = stubMethod(sandbox, fs, 'readFileSync').callsFake(
        (): string => sampleAuthData.jwtKeyWithHeaderFooter
      );
      const jwtKeyFile = prepareForJwt(homeDir);
      // eslint-disable-next-line no-unused-expressions
      expect(fs.existsSync(jwtKeyFile)).to.be.true;
      fs.readFileSync(jwtKeyFile, 'utf8');
      const jwtPassedToWrite = writeStub.args[0][1] as string;
      expect(writeStub.args[0][0]).to.be.equal(jwtKeyFile);
      expect((writeStub.args[0][1] as string).replace(/\n/g, '')).to.be.equal(sampleAuthData.jwtKeyWithHeaderFooter);
      expect(readStub.args[0][0]).to.be.equal(jwtKeyFile);
      expect(jwtPassedToWrite.split('\n').length).to.be.greaterThan(3);
      expect(jwtPassedToWrite).to.include('-----BEGIN RSA PRIVATE KEY-----');
      expect(jwtPassedToWrite).to.include('-----END RSA PRIVATE KEY-----');
    });

    it('should prepare test env for use with jwt auth that does not contain header/footer', () => {
      stubEnvGet([
        { key: 'TESTKIT_JWT_KEY', value: sampleAuthData.jwtKeyWithOutHeaderFooter },
        { key: 'TESTKIT_JWT_CLIENT_ID', value: sampleAuthData.clientId },
        { key: 'TESTKIT_HUB_USERNAME', value: sampleAuthData.devHubUsername },
        { key: 'TESTKIT_HUB_INSTANCE', value: sampleAuthData.instanceUrl },
      ]);
      writeStub.callsFake((): void => {
        return;
      });
      stubMethod(sandbox, fs, 'existsSync').callsFake((): boolean => true);
      const readStub = stubMethod(sandbox, fs, 'readFileSync').callsFake(
        (): string => sampleAuthData.jwtKeyWithHeaderFooter
      );
      const jwtKeyFile = prepareForJwt(homeDir);
      // eslint-disable-next-line no-unused-expressions
      expect(fs.existsSync(jwtKeyFile)).to.be.true;
      fs.readFileSync(jwtKeyFile, 'utf8');
      const jwtPassedToWrite = writeStub.args[0][1] as string;
      expect(writeStub.args[0][0]).to.be.equal(jwtKeyFile);
      expect((writeStub.args[0][1] as string).replace(/\n/g, '')).to.be.equal(sampleAuthData.jwtKeyWithHeaderFooter);
      expect(readStub.args[0][0]).to.be.equal(jwtKeyFile);
      expect(jwtPassedToWrite.split('\n').length).to.be.greaterThan(3);
      expect(jwtPassedToWrite).to.include('-----BEGIN RSA PRIVATE KEY-----');
      expect(jwtPassedToWrite).to.include('-----END RSA PRIVATE KEY-----');
    });

    it('should fail to prepare test env for use with jwt when required env var absent', () => {
      try {
        prepareForJwt(homeDir);
        expect.fail('Should have thrown a Error');
      } catch (e) {
        expect(e).to.be.an.instanceOf(Error);
        const error = e as Error;
        expect(error.message).to.include('env var TESTKIT_JWT_KEY is undefined');
      }
    });
  });
  describe('Prepare For Auth Url', () => {
    it('should prepare test env for use with sfdx auth url', () => {
      stubEnvGet([{ key: 'TESTKIT_AUTH_URL', value: sampleAuthData.sfdxAuthUrl }]);
      writeStub.callsFake((): void => {
        return;
      });
      const readStub = stubMethod(sandbox, fs, 'readFileSync').callsFake((): string => sampleAuthData.sfdxAuthUrl);
      stubMethod(sandbox, fs, 'existsSync').callsFake((): boolean => true);
      const authUrlFile = prepareForAuthUrl(homeDir);

      // eslint-disable-next-line no-unused-expressions
      expect(fs.existsSync(authUrlFile)).to.be.true;
      const authUrl: string = fs.readFileSync(authUrlFile, 'utf8');
      expect(readStub.args[0][0]).to.be.equal(authUrlFile);
      expect(writeStub.args[0][0]).to.be.equal(authUrlFile);
      const authUrlPassedToWrite = writeStub.args[0][1] as string;
      expect(authUrl).to.be.equal(authUrlPassedToWrite);
      expect(authUrlPassedToWrite).to.be.equal(sampleAuthData.sfdxAuthUrl);
    });
  });

  describe('Transfer Existing Auth To Env', () => {
    let shellStub;
    let readStub: sinon.SinonStub;
    beforeEach(() => {
      stubEnvGet([
        { key: 'HOME', value: homeDir },
        { key: 'TESTKIT_HUB_USERNAME', value: sampleAuthData.devHubUsername },
      ]);
      readStub = stubMethod(sandbox, fs, 'readFileSync');
    });

    it('should prepare test env for auth using existing username with no refresh token', () => {
      readStub
        .withArgs(authFields.privateKey, 'utf-8')
        .returns(sampleAuthData.jwtKeyWithHeaderFooter)
        .withArgs(sinon.match.any)
        .returns(JSON.stringify(authFields));
      shellStub = stubMethod(sandbox, shell, 'exec').returns({});
      transferExistingAuthToEnv('REUSE');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,no-unused-expressions
      expect(shellStub.calledOnce).to.be.false;
      sandbox.restore();
      expect(env.getString('TESTKIT_JWT_KEY')).to.be.equal(sampleAuthData.jwtKeyWithHeaderFooter);
      expect(env.getString('TESTKIT_JWT_CLIENT_ID')).to.be.equal(sampleAuthData.clientId);
      expect(env.getString('TESTKIT_HUB_INSTANCE')).to.be.equal(sampleAuthData.instanceUrl);
    });

    it('should prepare test env for auth using existing username with refresh token', () => {
      readStub
        .withArgs(authFields.privateKey, 'utf-8')
        .returns(sampleAuthData.jwtKeyWithHeaderFooter)
        .withArgs(sinon.match.any)
        .returns(JSON.stringify({ refreshToken: 'some-refresh-token' }));
      shellStub = stubMethod(sandbox, shell, 'exec').returns(
        JSON.stringify({ result: { sfdxAuthUrl: sampleAuthData.sfdxAuthUrl } })
      );
      transferExistingAuthToEnv('REUSE');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,no-unused-expressions
      expect(shellStub.calledOnce).to.be.true;
      sandbox.restore();
      expect(env.getString('TESTKIT_AUTH_URL')).to.be.equal(sampleAuthData.sfdxAuthUrl);
    });
  });
});
