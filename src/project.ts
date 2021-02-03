/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { debug, Debugger } from 'debug';
import * as shell from 'shelljs';
import { genUniqueString } from './genUniqueString';
import { execCmd } from './execCmd';

export interface TestProjectConfig {
  sourceDir?: string;
  gitClone?: string;
  name?: string;
  dir?: string;
}

/**
 * A SFDX project for use with testing.
 */
export class TestProject {
  public createdDate: Date;
  public path: string;
  private debug: Debugger;

  public constructor(options: TestProjectConfig) {
    this.debug = debug('testkit:project');
    this.createdDate = new Date();

    const dir = options.dir || path.join(process.cwd(), 'tmp');

    // Copy a dir containing a SFDX project to a dir for testing.
    if (options?.sourceDir) {
      shell.cp(options.sourceDir, dir);
      this.path = path.join(dir, path.dirname(options.sourceDir));
    }
    // Clone a git repo containing a SFDX project in a dir for testing.
    else if (options?.gitClone) {
      const rc = shell.exec(`git clone ${options.gitClone} ${dir}`, { silent: true });
      this.debug('git clone rc=', rc);
      if (rc.code !== 0) {
        throw new Error(`git clone failed \n${rc.stderr}`);
      }
      this.path = path.join(dir, 'changeme');
    }
    // Create a new project using the command.
    else {
      const name = options.name || genUniqueString('project_%s');
      execCmd(`force:project:create -n ${name}`, { ensureExitCode: 0 });
      this.path = path.join(dir, name);
    }
    this.debug(`Created test project: ${this.path}`);
  }

  /**
   * Return a list of org usernames this project knows about.
   */
  public getOrgs(): string {
    return 'NOT YET IMPLEMENTED';
  }
}
