/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as path from 'path';
import { debug, Debugger } from 'debug';
import { fs as fsCore } from '@salesforce/core';
import { Duration, env, parseJson, sleep } from '@salesforce/kit';
import { AnyJson, getString, Optional } from '@salesforce/ts-types';
import { createSandbox, SinonStub } from 'sinon';
import * as shell from 'shelljs';
import stripAnsi = require('strip-ansi');
import { genUniqueString } from './genUniqueString';
import { zipDir } from './zip';

import { TestProject, TestProjectOptions } from './testProject';
import { AuthStrategy, testkitHubAuth, transferExistingAuthToEnv } from './hubAuth';

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
   * Commands to run as setup for tests.  All must have exitCode == 0 or session
   * creation will throw.  Any org:create commands run as setup commands will
   * be deleted as part of `TestSession.clean()`.
   */
  setupCommands?: string[];

  /**
   * The preferred auth method to use
   */
  authStrategy?: keyof typeof AuthStrategy;
}

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
 *
 *   TESTKIT_HUB_USERNAME = username of an existing hub (authenticated before creating a session)
 *   TESTKIT_JWT_CLIENT_ID = clientId of connected app for auth:jwt:grant
 *   TESTKIT_JWT_KEY = JWT key (not a filepath, the actual contents of the key)
 *   TESTKIT_HUB_INSTANCE = instance url for the hub.  Defaults to https://login.salesforce.com
 *   TESTKIT_AUTH_URL = auth url to be used with auth:sfdxurl:store
 */
export class TestSession {
  public id: string;
  public createdDate: Date;
  public dir: string;
  public homeDir: string;
  public project?: TestProject;
  public setup?: AnyJson[] | shell.ShellString;

  private debug: Debugger;
  private cwdStub?: SinonStub;

  private overriddenDir?: string;
  private sandbox = createSandbox();
  private orgs: string[] = [];
  private zipDir;
  private sleep;

  private constructor(options: TestSessionOptions = {}) {
    this.debug = debug('testkit:session');
    this.zipDir = zipDir;
    this.sleep = sleep;
    this.createdDate = new Date();
    this.id = genUniqueString(`${this.createdDate.valueOf()}%s`);

    // Create the test session directory
    this.overriddenDir = env.getString('TESTKIT_SESSION_DIR') || options.sessionDir;
    this.dir = this.overriddenDir || path.join(process.cwd(), `test_session_${this.id}`);
    fsCore.mkdirpSync(this.dir);

    // Setup a test project and stub process.cwd to be the project dir
    if (options.project) {
      let projectDir = env.getString('TESTKIT_PROJECT_DIR');
      if (!projectDir) {
        this.project = new TestProject({ ...options.project, destinationDir: this.dir });
        projectDir = this.project.dir;
      }

      // the default bin/run in execCmd will no longer resolve properly when
      // a test project is used since process.cwd is changed.  If the
      // TESTKIT_EXECUTABLE_PATH env var is not being used, then set it
      // to use the bin/run from the cwd now.
      if (!env.getString('TESTKIT_EXECUTABLE_PATH')) {
        env.setString('TESTKIT_EXECUTABLE_PATH', path.join(process.cwd(), 'bin', 'run'));
      }

      this.stubCwd(projectDir);
    }

    // Write the test session options used to create this session
    fsCore.writeJsonSync(path.join(this.dir, 'testSessionOptions.json'), JSON.parse(JSON.stringify(options)));

    const authStrategy = options.authStrategy ? AuthStrategy[options.authStrategy] : undefined;
    // have to grab this before we change the home
    transferExistingAuthToEnv(authStrategy);

    // Set the homedir used by this test, on the TestSession and the process
    process.env.USERPROFILE = process.env.HOME = this.homeDir = env.getString('TESTKIT_HOMEDIR', this.dir);

    process.env.SFDX_USE_GENERIC_UNIX_KEYCHAIN = 'true';
    testkitHubAuth(this.homeDir, authStrategy);
    // Run all setup commands
    this.setupCommands(options.setupCommands);

    this.debug('Created testkit session:');
    this.debug(`  ID: ${this.id}`);
    this.debug(`  Created Date: ${this.createdDate}`);
    this.debug(`  Dir: ${this.dir}`);
    this.debug(`  Home Dir: ${this.homeDir}`);
    if (this.orgs?.length) {
      this.debug('  Orgs: ', this.orgs);
    }
    if (this.project) {
      this.debug(`  Project: ${this.project.dir}`);
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
   * Create a test session with the provided options.
   */
  public static create(options: TestSessionOptions = {}): TestSession {
    return new TestSession(options);
  }

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

    const rmSessionDir = async () => {
      // Delete the test session unless they overrode the test session dir
      if (!this.overriddenDir) {
        this.debug(`Deleting test session dir: ${this.dir}`);
        // Processes can hang on to files within the test session dir, preventing
        // removal so we wait a bit before trying.
        await this.sleep(Duration.seconds(2));
        const rv = shell.rm('-rf', this.dir);
        if (rv.code !== 0) {
          throw Error(`Deleting the test session failed due to: ${rv.stderr}`);
        }
      }
    };

    if (!env.getBoolean('TESTKIT_SAVE_ARTIFACTS')) {
      // Delete the orgs created by the tests unless pointing to a specific org
      if (!env.getString('TESTKIT_ORG_USERNAME') && this.orgs?.length) {
        for (const org of this.orgs) {
          this.debug(`Deleting test org: ${org}`);
          const rv = shell.exec(`sfdx force:org:delete -u ${org} -p`, { silent: true });
          if (rv.code !== 0) {
            // Must still delete the session dir if org:delete fails
            await rmSessionDir();
            throw Error(`Deleting org ${org} failed due to: ${rv.stderr}`);
          }
          this.debug('Deleted org result=', rv.stdout);
        }
      }
      // Delete the session dir
      await rmSessionDir();
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

  // Executes commands and keeps track of any orgs created.
  // Throws if any commands return a non-zero exitCode.
  private setupCommands(cmds?: string[]): void {
    if (cmds) {
      const dbug = debug('testkit:setupCommands');
      this.setup = [];

      for (let cmd of cmds) {
        if (cmd.includes('org:create')) {
          // Don't create orgs if we are supposed to reuse one from the env
          const org = env.getString('TESTKIT_ORG_USERNAME');
          if (org) {
            dbug(`Not creating a new org. Reusing TESTKIT_ORG_USERNAME of: ${org}`);
            this.setup.push({ result: { username: org } });
            continue;
          }
        }

        // Add the json flag if it looks like an sfdx command so we can return
        // parsed json in the command return.
        if (cmd.split(' ')[0].includes('sfdx') && !cmd.includes('--json')) {
          cmd += ' --json';
        }

        const rv = shell.exec(cmd, { silent: true });
        rv.stdout = stripAnsi(rv.stdout);
        rv.stderr = stripAnsi(rv.stderr);
        if (rv.code !== 0) {
          const io = cmd.includes('--json') ? rv.stdout : rv.stderr;
          throw Error(`Setup command ${cmd} failed due to: ${io}`);
        }
        dbug(`Output for setup cmd ${cmd} is:\n${rv.stdout}`);

        // Automatically parse json results
        if (cmd.includes('--json')) {
          try {
            const jsonOutput = parseJson(rv.stdout);
            // keep track of all org creates
            if (cmd.includes('org:create')) {
              const username = getString(jsonOutput, 'result.username');
              if (username) {
                dbug(`Saving org username: ${username} from ${cmd}`);
                this.orgs.push(username);
              }
            }
            this.setup.push(jsonOutput);
          } catch (err: unknown) {
            dbug(`Failed command output JSON parsing due to:\n${(err as Error).message}`);
            this.setup.push(rv);
          }
        } else {
          this.setup.push(rv);
        }
      }
    }
  }
}
