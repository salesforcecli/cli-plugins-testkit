/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { RetryConfig } from 'ts-retry-promise';
import { debug, Debugger } from 'debug';
import { AsyncOptionalCreatable, Duration, env, parseJson, sleep } from '@salesforce/kit';
import { Optional } from '@salesforce/ts-types';
import { createSandbox, SinonStub } from 'sinon';
import * as shell from 'shelljs';
import stripAnsi = require('strip-ansi');
import { AuthFields, OrgAuthorization } from '@salesforce/core';
import { genUniqueString } from './genUniqueString';
import { zipDir } from './zip';

import { TestProject, TestProjectOptions } from './testProject';
import { DevhubAuthStrategy, getAuthStrategy, testkitHubAuth, transferExistingAuthToEnv } from './hubAuth';
import { JsonOutput } from './execCmd';

export type ScratchOrgConfig = {
  /**
   * @deprecated 'sf' will be default
   */
  executable?: 'sfdx' | 'sf';
  config?: string;
  duration?: number;
  alias?: string;
  setDefault?: boolean;
  edition?:
    | 'developer'
    | 'enterprise'
    | 'group'
    | 'professional'
    | 'partner-developer'
    | 'partner-enterprise'
    | 'partner-group'
    | 'partner-professional';
  username?: string;
  wait?: number;
  /** true by default. Has no effect unless you set it to false */
  tracksSource?: boolean;
};

export interface TestSessionOptions {
  /**
   * Specify a different location for the test session.
   */
  sessionDir?: string;

  /**
   * Define a test project to use for tests.
   */
  project?: TestProjectOptions;

  /**
   * Scratch orgs to create as part of setup.  All must be created successfully or session
   * create will throw.  Scratch orgs created as part of setup will be deleted as part of
   * `TestSession.clean()`.
   */
  scratchOrgs?: ScratchOrgConfig[];

  /**
   * The preferred auth method to use
   */
  devhubAuthStrategy?: DevhubAuthStrategy;

  /**
   * The number of times to retry the scratch org create after the initial attempt if it fails. Will be overridden by TESTKIT_SETUP_RETRIES environment variable.
   */
  retries?: number;
}

// exported for test assertions
export const rmOptions = { recursive: true, force: true };
/**
 * Represents a test session, which is a unique location for non-unit test (nut)
 * artifacts such as a project and a mocked home dir.  It also provides easy
 * access to an org username created by a setup command, cwd stubbing, and a way to
 * zip up the test session.
 *
 * Create a TestSession instance with: `const testSession = TestSession.create(options)`
 *
 * Fine-grained control over certain test session details are provided by these
 * environment variables:
 *   TESTKIT_SESSION_DIR = Overrides the default directory for the test session
 *   TESTKIT_HOMEDIR = path to a home directory that the tests will use as a stub of os.homedir
 *   TESTKIT_ORG_USERNAME = an org username to use for test commands. tests will use this org rather than creating new orgs.
 *   TESTKIT_PROJECT_DIR = a SFDX project to use for testing. the tests will use this project directly.
 *   TESTKIT_SAVE_ARTIFACTS = prevents a test session from deleting orgs, projects, and test sessions.
 *   TESTKIT_ENABLE_ZIP = allows zipping the session dir when this is true
 *   TESTKIT_SETUP_RETRIES = number of times to retry the org creates after the initial attempt before throwing an error
 *   TESTKIT_SETUP_RETRIES_TIMEOUT = milliseconds to wait before the next retry of scratch org creations. Defaults to 5000
 *   TESTKIT_EXEC_SHELL = the shell to use for all testkit shell executions rather than the shelljs default.
 *
 *   TESTKIT_HUB_USERNAME = username of an existing hub (authenticated before creating a session)
 *   TESTKIT_JWT_CLIENT_ID = clientId of connected app for auth:jwt:grant
 *   TESTKIT_JWT_KEY = JWT key (not a filepath, the actual contents of the key)
 *   TESTKIT_HUB_INSTANCE = instance url for the hub.  Defaults to https://login.salesforce.com
 *   TESTKIT_AUTH_URL = auth url to be used with auth:sfdxurl:store
 */
export class TestSession<T extends TestSessionOptions = TestSessionOptions> extends AsyncOptionalCreatable<T> {
  public id: string;
  public createdDate: Date;
  public dir: string;
  public homeDir: string;
  public project!: T['project'] extends TestSessionOptions['project'] ? TestProject : TestProject | undefined;

  // this is stored on the class so that tests can set it to something much lower than default
  public rmRetryConfig: Partial<RetryConfig<void>> = { retries: 12, delay: 5000 };

  public orgs: Map<string, AuthFields> = new Map<string, AuthFields>();
  public hubOrg!: AuthFields;

  private debug: Debugger;
  private cwdStub?: SinonStub;

  private overriddenDir?: string;
  private sandbox = createSandbox();
  private retries: number;
  private zipDir: typeof zipDir;
  private options: T;
  private shelljsExecOptions: shell.ExecOptions = {
    silent: true,
  };
  private orgsAliases: string[] = ['default'];

  public constructor(options: T = {} as T) {
    super(options ?? ({} as T));
    this.options = options ?? ({} as T);
    this.debug = debug('testkit:session');
    this.zipDir = zipDir;

    this.createdDate = new Date();
    this.id = genUniqueString(`${this.createdDate.valueOf()}%s`);
    this.retries = env.getNumber('TESTKIT_SETUP_RETRIES', this.options.retries ?? 0);

    const shellOverride = env.getString('TESTKIT_EXEC_SHELL');
    if (shellOverride) {
      this.shelljsExecOptions.shell = shellOverride;
    }

    // Create the test session directory
    this.overriddenDir = env.getString('TESTKIT_SESSION_DIR') ?? this.options.sessionDir;
    this.dir = this.overriddenDir ?? path.join(process.cwd(), `test_session_${this.id}`);
    fs.mkdirSync(this.dir, { recursive: true });

    // Setup a test project and stub process.cwd to be the project dir
    if (this.options.project) {
      let projectDir = env.getString('TESTKIT_PROJECT_DIR');
      if (!projectDir) {
        this.project = new TestProject({ ...this.options.project, destinationDir: this.dir });
        projectDir = this.project.dir;
      }

      // The default bin/dev in execCmd will no longer resolve properly when
      // a test project is used since process.cwd is changed.  If the
      // TESTKIT_EXECUTABLE_PATH env var is not being used, then set it
      // to use the bin/dev from the cwd now.
      if (!env.getString('TESTKIT_EXECUTABLE_PATH')) {
        let binDev = path.join(process.cwd(), 'bin', 'dev');
        if (!fs.existsSync(binDev)) {
          binDev += '.js';
        }

        // only used in the case when bin/dev or bin/dev.js doesn't exist
        let binRun = path.join(process.cwd(), 'bin', 'run');
        if (!fs.existsSync(binRun)) {
          binRun += '.js';
        }
        env.setString('TESTKIT_EXECUTABLE_PATH', fs.existsSync(binDev) ? binDev : binRun);
      }

      this.stubCwd(projectDir);
    }

    // Write the test session options used to create this session
    fs.writeFileSync(
      path.join(this.dir, 'testSessionOptions.json'),
      JSON.stringify(JSON.parse(JSON.stringify(this.options)))
    );

    let authStrategy =
      this.options.devhubAuthStrategy === 'AUTO' ? getAuthStrategy() : this.options.devhubAuthStrategy ?? 'NONE';

    transferExistingAuthToEnv(authStrategy);

    authStrategy =
      this.options.devhubAuthStrategy === 'AUTO' ? getAuthStrategy() : this.options.devhubAuthStrategy ?? 'NONE';

    // Set the homedir used by this test, on the TestSession and the process
    process.env.USERPROFILE = process.env.HOME = this.homeDir = env.getString('TESTKIT_HOMEDIR', this.dir);

    process.env.SF_USE_GENERIC_UNIX_KEYCHAIN = 'true';
    testkitHubAuth(this.homeDir, authStrategy);

    if (authStrategy !== 'NONE') {
      const config = shell.exec('sf config get target-dev-hub --json', this.shelljsExecOptions) as shell.ShellString;
      const configResults = JSON.parse(stripAnsi(config.stdout)) as unknown as JsonOutput<
        Array<{ name: string; value: string }>
      >;
      const usernameOrAlias = configResults.result.find((org) => org.name === 'target-dev-hub')?.value;
      if (usernameOrAlias) {
        const displayEnv = shell.exec(
          `sf org:display -o ${usernameOrAlias} --json`,
          this.shelljsExecOptions
        ) as shell.ShellString;
        const displayEnvResults = JSON.parse(stripAnsi(displayEnv.stdout)) as unknown as JsonOutput<OrgAuthorization>;
        this.hubOrg = displayEnvResults.result;
      }
    }
  }

  /**
   * Get an existing test session created with the same options,
   * or create a new session if a match is not found.  This allows
   * sharing of test sessions between multiple test files.
   *
   * TODO: this needs to be implemented so that it works with
   *       parallel testing.  We need to read a testSessionOptions.json
   *       file and compare options, then return that session.
   *
   * public static get(options: TestSessionOptions = {}): TestSession {
   *   return sessions.get(options) ?? new TestSession(options);
   * }
   */

  /**
   * Stub process.cwd() to return the provided directory path.
   *
   * @param dir The directory path to set as the current working directory
   */
  public stubCwd(dir: string): void {
    if (this.cwdStub) {
      this.cwdStub.restore();
    }
    this.debug(`Stubbing process.cwd to: ${dir}`);
    this.cwdStub = this.sandbox.stub(process, 'cwd').returns(dir);
  }

  /**
   * Clean the test session by restoring the sandbox, deleting any setup
   * org created during the test, and deleting the test session dir.
   */
  public async clean(): Promise<void> {
    this.debug(`Cleaning test session: ${this.id}`);
    // Always restore the sandbox
    this.sandbox.restore();

    if (!env.getBoolean('TESTKIT_SAVE_ARTIFACTS')) {
      // Delete the orgs created by the tests unless pointing to a specific org
      await this.deleteOrgs();
      // Delete the session dir
      await this.rmSessionDir();
    }
  }

  /**
   * Zip the contents of a test session directory if the TESTKIT_ENABLE_ZIP
   * env var is set.
   *
   * @name The name of the zip file to create. Default is the test session dirname with .zip extension.
   * @destDir The zip file will be written to this path. Default is `this.dir/..`.
   * @returns The created zip file path.
   */
  public async zip(name?: string, destDir?: string): Promise<Optional<string>> {
    if (env.getBoolean('TESTKIT_ENABLE_ZIP')) {
      name ??= `${path.basename(this.dir)}.zip`;
      destDir ??= path.dirname(this.dir);
      return this.zipDir({ name, sourceDir: this.dir, destDir });
    }
  }

  protected async init(): Promise<void> {
    // Run all setup commands
    await this.createOrgs(this.options.scratchOrgs);

    this.debug('Created testkit session:');
    this.debug(`  ID: ${this.id}`);
    this.debug(`  Created Date: ${this.createdDate}`);
    this.debug(`  Dir: ${this.dir}`);
    this.debug(`  Home Dir: ${this.homeDir}`);
    if (this.orgs.size > 0) {
      this.debug('  Orgs: ', this.orgs);
    }
    if (this.project) {
      this.debug(`  Project: ${this.project.dir}`);
    }
  }

  private async deleteOrgs(): Promise<void> {
    if (!env.getString('TESTKIT_ORG_USERNAME') && this.orgs.size > 0) {
      for (const org of [...this.orgs.keys()]) {
        if (this.orgsAliases.includes(org)) continue;

        this.debug(`Deleting test org: ${org}`);
        const rv = shell.exec(`sf org:delete:scratch -o ${org} -p`, this.shelljsExecOptions) as shell.ShellString;
        this.orgs.delete(org);
        if (rv.code !== 0) {
          // Must still delete the session dir if org:delete fails
          // eslint-disable-next-line no-await-in-loop
          await this.rmSessionDir();
          throw Error(`Deleting org ${org} failed due to: ${rv.stderr}`);
        }
        this.debug('Deleted org result=', rv.stdout);
      }
    }
  }

  private async rmSessionDir(): Promise<void> {
    // Delete the test session unless they overrode the test session dir
    if (this.overriddenDir) {
      return;
    }
    this.debug(`Deleting test session dir: ${this.dir}`);
    try {
      return await fs.promises.rm(this.dir, rmOptions);
    } catch (e) {
      this.debug(`Error deleting test session dir: ${this.dir}`);
      this.debug(e);
    }
  }

  // Executes commands and keeps track of any orgs created.
  // Throws if any commands return a non-zero exitCode.
  private async createOrgs(orgs: ScratchOrgConfig[] = []): Promise<void> {
    if (orgs.length === 0) return;

    const dbug = debug('testkit:createOrgs');
    const setup = () => {
      for (const org of orgs) {
        // Don't create orgs if we are supposed to reuse one from the env
        const orgUsername = env.getString('TESTKIT_ORG_USERNAME');
        if (orgUsername) {
          dbug(`Not creating a new org. Reusing TESTKIT_ORG_USERNAME of: ${org}`);
          this.orgs.set(orgUsername, { username: orgUsername });
          continue;
        }

        const executable = org.executable ?? 'sf';

        if (!shell.which(executable)) {
          throw new Error(`${executable} executable not found for creating scratch orgs`);
        }

        let baseCmd = `sf org:create:scratch --json -y ${org.duration ?? '1'} -w ${org.wait ?? 60}`;

        if (org.config) {
          baseCmd += ` -f ${org.config}`;
        }

        if (org.alias) {
          baseCmd += ` -a ${org.alias}`;
        }

        if (org.setDefault) {
          baseCmd += ' -d';
        }

        if (org.username) {
          baseCmd += ` --username ${org.username}`;
        }

        if (org.edition) {
          baseCmd += ` -e ${org.edition}`;
        }

        // explicitly disable tracking only if set to false.  True is the default on the command
        if (org.tracksSource === false) {
          baseCmd += ' --no-track-source';
        }

        const rv = shell.exec(baseCmd, this.shelljsExecOptions) as shell.ShellString;
        rv.stdout = stripAnsi(rv.stdout);
        rv.stderr = stripAnsi(rv.stderr);
        if (rv.code !== 0) {
          throw Error(`${baseCmd} failed due to: ${rv.stdout}`);
        }
        dbug(`Output for ${baseCmd} is:\n${rv.stdout}`);

        const jsonOutput = parseJson(rv.stdout) as {
          status: number;
          result: { username: string; authFields: AuthFields };
        };
        const username = jsonOutput.result.username;
        dbug(`Saving org username: ${username} from ${baseCmd}`);
        this.orgs.set(username, jsonOutput.result.authFields);
        if (org.setDefault) {
          this.orgs.set('default', jsonOutput.result.authFields);
        }

        if (org.alias) {
          this.orgsAliases.push(org.alias);
          this.orgs.set(org.alias, jsonOutput.result.authFields);
        }
      }
    };

    let attempts = 0;
    let completed = false;
    const timeout = new Duration(env.getNumber('TESTKIT_SETUP_RETRIES_TIMEOUT') ?? 5000, Duration.Unit.MILLISECONDS);

    while (!completed && attempts <= this.retries) {
      try {
        dbug(`Executing org create(s) (attempt ${attempts + 1} of ${this.retries + 1})`);
        setup();
        completed = true;
      } catch (err) {
        attempts += 1;
        if (attempts > this.retries) {
          throw err;
        }
        dbug(`Setup failed. waiting ${timeout.seconds} seconds before next attempt...`);
        // eslint-disable-next-line no-await-in-loop
        await this.deleteOrgs();
        // eslint-disable-next-line no-await-in-loop
        await this.sleep(timeout);
      }
    }
  }

  // used for test spy/stub
  // eslint-disable-next-line class-methods-use-this
  private async sleep(duration: Duration): Promise<void> {
    await sleep(duration);
  }
}
