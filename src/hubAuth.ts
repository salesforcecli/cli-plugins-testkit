/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import * as os from 'os';
import { fs } from '@salesforce/core';
import * as shell from 'shelljs';
import { debug } from 'debug';

// this seems to be a known eslint error for enums
// eslint-disable-next-line no-shadow
enum AuthStrategy {
  JWT = 'JWT',
  AUTH_URL = 'AUTH_URL',
  REUSE = 'REUSE',
  NONE = 'NONE',
}

export const authFromStubbedHome = (homeDir: string): void => {
  const logger = debug('testkit:authFromStubbedHome');
  if (getAuthStrategy() === AuthStrategy.JWT && process.env.TESTKIT_JWT_KEY) {
    logger('trying jwt auth');
    const jwtKey = path.join(homeDir, 'jwtKey');
    fs.writeFileSync(jwtKey, process.env.TESTKIT_JWT_KEY);

    shell.exec(
      `sfdx auth:jwt:grant -d -u ${process.env.TESTKIT_HUB_USERNAME} -i ${
        process.env.TESTKIT_JWT_CLIENT_ID
      } -f ${jwtKey} -r ${process.env.TESTKIT_HUB_INSTANCE || 'https://login.salesforce.com'}`,
      { silent: true }
    );
    return;
  }
  if (getAuthStrategy() === AuthStrategy.AUTH_URL && process.env.TESTKIT_AUTH_URL) {
    logger('trying to authenticate with AuthUrl');

    const tmpUrl = path.join(homeDir, 'tmpUrl');
    fs.writeFileSync(tmpUrl, process.env.TESTKIT_AUTH_URL);

    const shellOutput = shell.exec(`sfdx auth:sfdxurl:store -d -f ${tmpUrl}`, { silent: true });
    logger(shellOutput);

    return;
  }
  logger('no hub configured');
};

const getAuthStrategy = (): AuthStrategy => {
  if (process.env.TESTKIT_JWT_CLIENT_ID && process.env.TESTKIT_HUB_USERNAME && process.env.TESTKIT_JWT_KEY) {
    return AuthStrategy.JWT;
  }
  if (process.env.TESTKIT_AUTH_URL) {
    return AuthStrategy.AUTH_URL;
  }
  // none of the above are included, so we want to reuse an already authenticated hub
  if (process.env.TESTKIT_HUB_USERNAME) {
    return AuthStrategy.REUSE;
  }
  return AuthStrategy.NONE;
};

// moves jwt files;
export const transferExistingAuthToEnv = (): void => {
  // nothing to do if the variables are already provided
  if (getAuthStrategy() !== AuthStrategy.REUSE) return;
  const logger = debug('testkit:AuthReuse');
  logger(`reading ${process.env.TESTKIT_HUB_USERNAME}.json`);
  const authFileName = `${process.env.TESTKIT_HUB_USERNAME}.json`;
  const hubAuthFileSource = path.join(process.env.HOME || os.homedir(), '.sfdx', authFileName);
  const authFileContents = (fs.readJsonSync(hubAuthFileSource) as unknown) as AuthFile;
  if (authFileContents.privateKey) {
    logger('copying variables to env from AuthFile for JWT');
    // this is jwt.  set the appropriate env vars
    process.env.TESTKIT_JWT_KEY = fs.readFileSync(authFileContents.privateKey, 'utf-8');
    process.env.TESTKIT_JWT_CLIENT_ID = authFileContents.clientId;
    process.env.TESTKIT_HUB_INSTANCE = authFileContents.instanceUrl;
    return;
  }
  if (authFileContents.refreshToken) {
    // this is a org from web:auth or auth:url.  Generate the authUrl and set in the env
    logger('copying variables to env from org:display for AuthUrl');
    const displayContents = JSON.parse(
      shell.exec(`sfdx force:org:display -u ${process.env.TESTKIT_HUB_USERNAME} --verbose --json`, {
        silent: true,
      }) as string
    ) as OrgDisplayResult;
    logger(`found ${displayContents.result.sfdxAuthUrl}`);

    process.env.TESTKIT_AUTH_URL = displayContents.result.sfdxAuthUrl;
    return;
  }
  throw new Error(
    `Unable to reuse existing hub ${process.env.TESTKIT_HUB_USERNAME}.  Check file ${process.env.TESTKIT_HUB_USERNAME}.json`
  );
};

interface AuthFile {
  username: string;
  instanceUrl: string;
  clientId?: string;
  privateKey?: string;
  refreshToken?: string;
}

interface OrgDisplayResult {
  result: {
    sfdxAuthUrl?: string;
  };
}
