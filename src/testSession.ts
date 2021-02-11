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
import { getString, Optional } from '@salesforce/ts-types';
import { createSandbox, SinonStub } from 'sinon';
import * as shell from 'shelljs';
import { genUniqueString } from './genUniqueString';
import { zipDir } from './zip';
import { TestProject, TestProjectConfig } from './testProject';

export interface TestSessionOptions {
  /**
   * Specify a different location for the test session.
   */
  sessionDir?: string;

  /**
   * Define a test project to use for tests.
   */
  project?: TestProjectConfig;

  /**
   * Commands to run as setup for tests.  All must have exitCode == 0 or session
   * creation will throw.  If an org create command is specified the test session
   * will have a `orgUsername` property for use in tests.
   */
  setupCommands?: string[];
}

// Executes commands and sets the org username if an org was created.
// Throws if any commands return a non-zero exitCode.
const setupCommands = (testSession: TestSession, cmds?: string[]): void => {
  // Add setup command results to an array on the TestSession so tests have access
  // to that data.
  testSession.setupCommandsResults = [];

  if (cmds) {
    const dbug = debug('testkit:setupCommands');
    for (let cmd of cmds) {
      // if it's an org:create without --json, append it anyway so we
      // can get the org username and keep track of it.
      if (cmd.includes('org:create')) {
        // Don't create orgs if we are supposed to reuse one from the env
        const org = env.getString('TESTKIT_ORG_USERNAME');
        if (org) {
          dbug(`Not creating a new org. Resuing TESTKIT_ORG_USERNAME of: ${org}`);
          testSession.setupCommandsResults.push(new shell.ShellString(`TESTKIT_ORG_USERNAME=${org}`));
          continue;
        }
        if (!cmd.includes('--json')) {
          cmd += ' --json';
        }
      }
      const rv = shell.exec(cmd, { silent: true });
      if (rv.code !== 0) {
        const io = cmd.includes('--json') ? rv.stdout : rv.stderr;
        throw Error(`Setup command ${cmd} failed due to: ${io}`);
      }
      dbug(`Output for setup cmd ${cmd} is:\n${rv.stdout}`);

      // keep track of the first org create
      if (cmd.includes('org:create') && !testSession.orgUsername) {
        try {
          dbug(`Saving username from ${cmd}`);
          const jsonOutput = parseJson(rv.stdout);
          testSession.orgUsername = getString(jsonOutput, 'result.username') || undefined;
        } catch (err: unknown) {
          dbug(`TestSession created an org but failed JSON parsing due to:\n${(err as Error).message}`);
        }
      }

      testSession.setupCommandsResults.push(rv);
    }
  }
};

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
 */
export class TestSession {
  public id: string;
  public createdDate: Date;
  public dir: string;
  public homeDir: string;
  public project?: TestProject;
  public orgUsername = env.getString('TESTKIT_ORG_USERNAME');
  public setupCommandsResults?: shell.ShellString[];

  private debug: Debugger;
  private cwdStub?: SinonStub;
  private overridenDir?: string;
  private sandbox = createSandbox();

  private constructor(options: TestSessionOptions = {}) {
    this.debug = debug('testkit:session');
    this.createdDate = new Date();
    this.id = genUniqueString(`${this.createdDate.valueOf()}%s`);

    // Create the test session directory
    this.overridenDir = env.getString('TESTKIT_SESSION_DIR') || options.sessionDir;
    this.dir = this.overridenDir || path.join(process.cwd(), `test_session_${this.id}`);
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

    // Set the homedir used by this test, on the TestSession and the process
    process.env.HOME = this.homeDir = env.getString('TESTKIT_HOMEDIR', this.dir);

    // Run all setup commands
    setupCommands(this, options.setupCommands);

    this.debug('Created testkit session:');
    this.debug(`  ID: ${this.id}`);
    this.debug(`  Created Date: ${this.createdDate}`);
    this.debug(`  Dir: ${this.dir}`);
    this.debug(`  Home Dir: ${this.homeDir}`);
    if (this.orgUsername) {
      this.debug(`  Org Username: ${this.orgUsername}`);
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

    if (!env.getBoolean('TESTKIT_SAVE_ARTIFACTS')) {
      // Delete the orgs created by the tests unless pointing to a specific org
      if (!env.getString('TESTKIT_ORG_USERNAME') && this.orgUsername) {
        this.debug(`Deleting test org: ${this.orgUsername}`);
        const rv = shell.exec(`sfdx force:org:delete -u ${this.orgUsername} -p`, { silent: true });
        if (rv.code !== 0) {
          throw Error(`Deleting org ${this.orgUsername} failed due to: ${rv.stderr}`);
        }
        this.debug('Deleted org result=', rv.stdout);
      }

      // Delete the test session unless they overrode the test session dir
      if (!this.overridenDir) {
        this.debug(`Deleting test session dir: ${this.dir}`);
        // Processes can hang on to files within the test session dir, preventing
        // removal so we wait a bit before trying.
        await sleep(Duration.seconds(2));
        const rv = shell.rm('-rf', this.dir);
        if (rv.code !== 0) {
          throw Error(`Deleting the test session failed due to: ${rv.stderr}`);
        }
      }
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
      return zipDir({ name, sourceDir: this.dir, destDir });
    }
  }
}
