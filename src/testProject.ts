/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { inspect } from 'util';
import { debug, Debugger } from 'debug';
import * as shell from 'shelljs';
import { env } from '@salesforce/kit';
import { genUniqueString } from './genUniqueString';
import { zipDir, ZipDirConfig } from './zip';

export type TestProjectOptions = {
  name?: string;
  destinationDir?: string;
} & ({ sourceDir: string } | { gitClone: string } | { apiVersion?: `${number}.0` });

/**
 * A SFDX project for use with testing.  The project can be defined by:
 *   1. Copied from a project on the filesystem to a destination dir
 *   2. Cloned using a git url
 *   3. Created by name using the project:generate command
 *
 * The project will be copied/cloned/created to the provided destination dir
 * or the OS tmpdir by default.
 */
export class TestProject {
  public createdDate: Date;
  public dir: string;
  private debug: Debugger;
  private zipDir: (config: ZipDirConfig) => Promise<string>;
  private shelljsExecOptions: shell.ExecOptions = {
    silent: true,
  };

  public constructor(options: TestProjectOptions) {
    this.debug = debug('testkit:project');
    this.debug(`Creating TestProject with options: ${inspect(options)}`);
    this.zipDir = zipDir;
    this.createdDate = new Date();

    const destDir = options.destinationDir ?? tmpdir();

    const shellOverride = env.getString('TESTKIT_EXEC_SHELL');
    if (shellOverride) {
      this.shelljsExecOptions.shell = shellOverride;
    }

    // Copy a dir containing a SFDX project to a dir for testing.
    if ('sourceDir' in options) {
      const rv = shell.cp('-r', options.sourceDir, destDir);
      if (rv.code !== 0) {
        throw new Error(`project copy failed with error:\n${rv.stderr}`);
      }
      this.dir = path.join(destDir, path.basename(options.sourceDir));
    }
    // Clone a git repo containing a SFDX project in a dir for testing.
    else if ('gitClone' in options) {
      // verify git is found
      if (!shell.which('git')) {
        throw new Error('git executable not found for creating a project from a git clone');
      }
      this.debug(`Cloning git repo: ${options.gitClone} to: ${destDir}`);
      const execOpts = { ...this.shelljsExecOptions, ...{ cwd: destDir } };
      const rv = shell.exec(`git clone ${options.gitClone}`, execOpts) as shell.ShellString;
      if (rv.code !== 0) {
        throw new Error(`git clone failed with error:\n${rv.stderr}`);
      }
      // the git clone will fail if the destination dir is not empty, so after
      // a successful clone the only contents should be the cloned repo dir.
      const cloneDirName = fs.readdirSync(destDir)[0];
      this.dir = path.join(destDir, cloneDirName);
    }
    // Create a new project using the command.
    else {
      // verify sf is found
      if (!shell.which('sf')) {
        throw new Error('sf executable not found for creating a project using project:generate command');
      }
      const name = options.name ?? genUniqueString('project_%s');
      const rv = shell.exec(
        `sf project:generate -n ${name} -d ${destDir}${
          options.apiVersion ? ` --api-version ${options.apiVersion}` : ''
        }`,
        this.shelljsExecOptions
      ) as shell.ShellString;
      if (rv.code !== 0) {
        throw new Error(`project:generate failed with error:\n${rv.stderr}`);
      }
      this.dir = path.join(destDir, name);
    }
    this.debug(`Created test project: ${this.dir}`);
  }

  /**
   * Zip the test project contents
   *
   * @name name of the zip file to create. Default is the project dirname.
   * @destDir The zip file will be written to this path. Default is `process.cwd()`.
   * @returns The created zip file path.
   */
  public async zip(name?: string, destDir?: string): Promise<string> {
    name ??= `${path.basename(this.dir)}.zip`;
    destDir ??= path.dirname(this.dir);
    return this.zipDir({ name, sourceDir: this.dir, destDir });
  }
}
