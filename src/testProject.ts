/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { inspect } from 'util';
import { debug, Debugger } from 'debug';
import * as shell from 'shelljs';
import { genUniqueString } from './genUniqueString';
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
  public dir: string;
  private debug: Debugger;

  public constructor(options: TestProjectConfig) {
    this.debug = debug('testkit:project');
    this.debug(`Creating TestProject with options: ${inspect(options)}`);
    this.createdDate = new Date();

    const dir = options.destinationDir || path.join(process.cwd(), 'tmp');

    // Copy a dir containing a SFDX project to a dir for testing.
    if (options?.sourceDir) {
      const rv = shell.cp('-r', options.sourceDir, dir);
      this.debug('project copy result=', rv);
      if (rv.code !== 0) {
        throw new Error(`project copy failed \n${rv.stderr}`);
      }
      this.dir = path.join(dir, path.basename(options.sourceDir));
    }
    // Clone a git repo containing a SFDX project in a dir for testing.
    else if (options?.gitClone) {
      const rv = shell.exec(`git clone ${options.gitClone} ${dir}`, { silent: true });
      this.debug('git clone result=', rv);
      if (rv.code !== 0) {
        throw new Error(`git clone failed \n${rv.stderr}`);
      }
      this.dir = path.join(dir, 'changeme');
    }
    // Create a new project using the command.
    else {
      const name = options.name || genUniqueString('project_%s');
      const rv = shell.exec(`sfdx force:project:create -n ${name} -d ${dir}`, { silent: true });
      if (rv.code !== 0) {
        throw new Error(`force:project:create failed \n${rv.stderr}`);
      }
      this.dir = path.join(dir, name);
    }
    this.debug(`Created test project: ${this.dir}`);
  }

  /**
   * Zip the test project contents
   *
   * @name The name of the zip file to create. Default is the project dirname.
   * @destDir The zip file will be written to this path. Default is `process.cwd()`.
   * @returns The created zip file path.
   */
  public async zip(name?: string, destDir?: string): Promise<string> {
    name ??= `${path.basename(this.dir)}.zip`;
    destDir ??= path.dirname(this.dir);
    return zipDir({ name, sourceDir: this.dir, destDir });
  }
}
