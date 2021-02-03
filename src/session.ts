/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as os from 'os';
import { debug, Debugger } from 'debug';
import { fs as fsCore } from '@salesforce/core';
import { env } from '@salesforce/kit';
import { createSandbox, SinonStub } from 'sinon';
import { genUniqueString } from './genUniqueString';
import { TestProject, TestProjectConfig } from './project';

export interface SessionOptions {
  sessionDir?: string;
  project?: TestProjectConfig;
}

/*
   *** ENV VARS ***
  TESTKIT_SESSION_DIR = path to a directory for all testkit artifacts to live
  TESTKIT_SFDX_DIR = path to a .sfdx directory
*/

// Map of existing test sessions
const sessions = new Map<SessionOptions, Session>();

/**
 * Represents a test session.
 */
export class Session {
  public id: string;
  public createdDate: Date;
  public dir: string;
  public sfdxDir: string;
  public projects: TestProject[] = [];
  public sandbox = createSandbox();

  private debug: Debugger;
  private cwdStub?: SinonStub;

  private constructor(options: SessionOptions = {}) {
    this.debug = debug('testkit:session');
    this.createdDate = new Date();
    this.id = genUniqueString(`${this.createdDate.valueOf()}%s`);

    // Create the test session directory
    const defaultDir = path.join(process.cwd(), `test_session_${this.id}`);
    this.dir = env.getString('TESTKIT_SESSION_DIR', defaultDir);
    fsCore.mkdirpSync(this.dir);

    // Create the .sfdx directory used by this test
    const defaultSfdxDir = path.join(this.dir, '.sfdx');
    this.sfdxDir = env.getString('TESTKIT_SFDX_DIR', defaultSfdxDir);
    fsCore.mkdirpSync(this.sfdxDir);
    this.sandbox.stub(os, 'homedir').returns(this.dir);

    // Setup a test project
    if (options.project) {
      const project = this.addProject(options.project);
      this.stubCwd(project.path);
    }

    const props = Object.getOwnPropertyNames(this);
    this.debug(`Created testkit session: ${props}`);
  }

  /**
   * Get an existing test session created with the same options,
   * or create a new session if a match is not found.  This allows
   * sharing of test sessions between multiple test files.
   */
  public static get(options: SessionOptions = {}): Session {
    return sessions.get(options) ?? new Session(options);
  }

  /**
   * Create a test session with the provided options.
   */
  public static create(options: SessionOptions = {}): Session {
    return new Session(options);
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
    this.cwdStub = this.sandbox.stub(process, 'cwd').returns(dir);
  }

  /**
   * Clean the test session by restoring the sandbox and
   * deleting all orgs created during the test.
   */
  public clean(): void {
    this.sandbox.restore();
    // delete test orgs unless TESTKIT_SAVE_ARTIFACTS set
    // this.projects.
  }

  /**
   * Zip the test session contents
   */
  public zip(): string {
    return 'NOT YET IMPLEMENTED';
  }

  /**
   * Add another SFDX project to the test session.
   *
   * @param config a test project config to use for the new project
   */
  public addProject(config: TestProjectConfig): TestProject {
    const projConfig = { ...{ dir: this.dir }, ...config };
    const project = new TestProject(projConfig);
    this.projects.push(project);
    return project;
  }
}
