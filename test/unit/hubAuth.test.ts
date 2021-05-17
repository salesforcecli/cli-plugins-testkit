/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as os from 'os';
import * as path from 'path';
import { stubMethod } from '@salesforce/ts-sinon';
import * as chai from 'chai';
import { AuthFields, fs } from '@salesforce/core';
import { env } from '@salesforce/kit';
import * as sinon from 'sinon';
import * as shell from 'shelljs';
import {
  AuthStrategy,
  prepareForAccessToken,
  prepareForAuthUrl,
  prepareForJwt,
  testkitHubAuth,
  transferExistingAuthToEnv,
} from '../../src/hubAuth';

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

describe('hubAuth', () => {
  const sandbox = sinon.createSandbox();

  let homeDir: string;
  beforeEach(() => {
    homeDir = `${path.join(tmp, path.sep)}${new Date().getTime()}`;
    fs.mkdirpSync(homeDir);
  });
  afterEach(() => {
    const testFiles = fs.readdirSync(homeDir);
    try {
      testFiles.forEach((file) => fs.unlinkSync(file));
      fs.unlinkSync(homeDir);
    } catch (e) {
      // no-op
    }
    env
      .entries()
      .filter(([key]) => key.startsWith('TESTKIT'))
      .forEach(([key]) => env.unset(key));
  });
  describe('Prepare For Jwt', () => {
    it('should prepare test env for use with jwt auth that contains header/footer', () => {
      env.setString('TESTKIT_JWT_KEY', sampleAuthData.jwtKeyWithHeaderFooter);
      env.setString('TESTKIT_HUB_USERNAME', sampleAuthData.clientId);
      env.setString('TESTKIT_HUB_INSTANCE', sampleAuthData.instanceUrl);
      const jwtKeyFile = prepareForJwt(homeDir);
      // eslint-disable-next-line no-unused-expressions
      expect(fs.existsSync(jwtKeyFile)).to.be.true;
      const jwtKey: string = fs.readFileSync(jwtKeyFile, 'utf8');
      expect(jwtKey.split('\n').length).to.be.greaterThan(3);
      expect(jwtKey).to.include('-----BEGIN RSA PRIVATE KEY-----');
      expect(jwtKey).to.include('-----END RSA PRIVATE KEY-----');
    });

    it('should prepare test env for use with jwt auth that does not contain header/footer', () => {
      env.setString('TESTKIT_JWT_KEY', sampleAuthData.jwtKeyWithOutHeaderFooter);
      env.setString('TESTKIT_HUB_USERNAME', sampleAuthData.clientId);
      env.setString('TESTKIT_HUB_INSTANCE', sampleAuthData.instanceUrl);
      const jwtKeyFile = prepareForJwt(homeDir);
      // eslint-disable-next-line no-unused-expressions
      expect(fs.existsSync(jwtKeyFile)).to.be.true;
      const jwtKey: string = fs.readFileSync(jwtKeyFile, 'utf8');
      expect(jwtKey.split('\n').length).to.be.greaterThan(3);
      expect(jwtKey).to.include('-----BEGIN RSA PRIVATE KEY-----');
      expect(jwtKey).to.include('-----END RSA PRIVATE KEY-----');
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
  describe('Prepare For Access Token', () => {
    it('should prepare test env for use with access token auth', () => {
      env.setString('TESTKIT_AUTH_ACCESS_TOKEN', sampleAuthData.accessToken);
      const accessTokenFile = prepareForAccessToken(homeDir);
      // eslint-disable-next-line no-unused-expressions
      expect(fs.existsSync(accessTokenFile)).to.be.true;
      const accessToken: string = fs.readFileSync(accessTokenFile, 'utf8');
      expect(accessToken).to.be.equal(sampleAuthData.accessToken);
    });
  });
  describe('Prepare For Auth Url', () => {
    it('should prepare test env for use with sfdx auth url', () => {
      env.setString('TESTKIT_AUTH_URL', sampleAuthData.sfdxAuthUrl);
      const authUrlFile = prepareForAuthUrl(homeDir);
      // eslint-disable-next-line no-unused-expressions
      expect(fs.existsSync(authUrlFile)).to.be.true;
      const authUrl: string = fs.readFileSync(authUrlFile, 'utf8');
      expect(authUrl).to.be.equal(sampleAuthData.sfdxAuthUrl);
    });
  });

  describe('Transfer Existing Auth To Env', () => {
    const originalHomeDir = env.getString('HOME');
    let shellStub;
    beforeEach(() => {
      env.setString('HOME', homeDir);
      env.setString('TESTKIT_HUB_USERNAME', sampleAuthData.devHubUsername);
      stubMethod(sandbox, fs, 'readFileSync').returns(sampleAuthData.jwtKeyWithHeaderFooter);
    });

    afterEach(() => {
      sandbox.restore();
      if (originalHomeDir) {
        env.setString('HOME', originalHomeDir);
      }
    });

    it('should prepare test env for auth using existing username with no refresh token', () => {
      stubMethod(sandbox, fs, 'readJsonSync').returns(authFields);
      shellStub = stubMethod(sandbox, shell, 'exec').returns({});
      transferExistingAuthToEnv(AuthStrategy.REUSE);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,no-unused-expressions
      expect(shellStub.calledOnce).to.be.false;
      expect(env.getString('TESTKIT_JWT_KEY')).to.be.equal(sampleAuthData.jwtKeyWithHeaderFooter);
      expect(env.getString('TESTKIT_JWT_CLIENT_ID')).to.be.equal(sampleAuthData.clientId);
      expect(env.getString('TESTKIT_HUB_INSTANCE')).to.be.equal(sampleAuthData.instanceUrl);
    });

    it('should prepare test env for auth using existing username with refresh token', () => {
      stubMethod(sandbox, fs, 'readJsonSync').returns({ refreshToken: 'some-refresh-token' });
      shellStub = stubMethod(sandbox, shell, 'exec').returns(
        JSON.stringify({ result: { sfdxAuthUrl: sampleAuthData.sfdxAuthUrl } })
      );
      transferExistingAuthToEnv(AuthStrategy.REUSE);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,no-unused-expressions
      expect(shellStub.calledOnce).to.be.true;
      expect(env.getString('TESTKIT_AUTH_URL')).to.be.equal(sampleAuthData.sfdxAuthUrl);
    });
  });
});
