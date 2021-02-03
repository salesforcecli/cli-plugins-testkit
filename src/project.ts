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
import { zipDir } from './zip';

export interface TestProjectConfig {
  sourceDir?: string;
  gitClone?: string;
  name?: string;
  destinationDir?: string;
}

/**
 * A SFDX project for use with testing.  The project can be defined by:
 *   1. Copied from a project on the filesystem to a destination dir
 *   2. Cloned using a git url
 *   3. Created by name using the force:project:create command
 */
export class TestProject {
  public createdDate: Date;
  public path: string;
  private debug: Debugger;

  public constructor(options: TestProjectConfig) {
    this.debug = debug('testkit:project');
    this.createdDate = new Date();

    const dir = options.destinationDir || path.join(process.cwd(), 'tmp');

    // Copy a dir containing a SFDX project to a dir for testing.
    if (options?.sourceDir) {
      const rv = shell.cp(options.sourceDir, dir);
      this.debug('project copy result=', rv);
      if (rv.code !== 0) {
        throw new Error(`project copy failed \n${rv.stderr}`);
      }
      this.path = path.join(dir, path.dirname(options.sourceDir));
    }
    // Clone a git repo containing a SFDX project in a dir for testing.
    else if (options?.gitClone) {
      const rv = shell.exec(`git clone ${options.gitClone} ${dir}`, { silent: true });
      this.debug('git clone result=', rv);
      if (rv.code !== 0) {
        throw new Error(`git clone failed \n${rv.stderr}`);
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
   * Zip the test project contents
   *
   * @name The name of the zip file to create. Default is the project dirname.
   * @destDir The zip file will be written to this path. Default is `process.cwd()`.
   * @returns The created zip file path.
   */
  public async zip(name?: string, destDir?: string): Promise<string> {
    name ??= path.dirname(this.path);
    destDir ??= process.cwd();
    return zipDir({ name, sourceDir: this.path, destDir });
  }
}
