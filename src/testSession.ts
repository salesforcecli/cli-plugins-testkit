/*
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint-disable no-console */

import { fs } from '@salesforce/core';
import { Env, parseJson } from '@salesforce/kit';
import * as shelljs from 'shelljs';

interface TestSessionOptions {
  projectPath: string; // where the project will exist during the test
  projectSource: string; // local path or github repo.  If you **really** want to, it could be the same as projectPath
  stubHomeDir?: string; // optionally stub the sfdx home dir.  The provided string will be the name used for that file
  stubCWD?: boolean; // if true, stub the CWD to be the projectPath
  setupCommands?: string[]; // commands that should be run, sequentially, with ensureExitCode = 0, to get the org ready.  Leave blank if you want to do this stuff manually
  setEnv?: Record<string, unknown>; // things to set into env for this test
}

interface TestSessionResult {
  projectPath: string;
  status: number;
  usedLeftovers: boolean; // just to confirm that setup **did** find some leftovers to use
}

const isLeftovers = () => {
  return new Env().getBoolean('LEFTOVERS_MODE');
};

export const stubs = {
  stubHomeDir: (name: string): void => {
    console.log(`${name} | home stub not implemented`);
  },
  stubCWD: (name: string): void => {
    console.log(`${name} | cwd stub not implemented`);
  },
  restoreAll: (): void => {
    console.log('restore all stubs not implemented');
    // delete the stubbed home directory if it was written to FS
  },
};

export const setup = async (options: TestSessionOptions): Promise<TestSessionResult> => {
  const output = {
    projectPath: options.projectPath,
  };
  if (options.stubCWD) {
    stubs.stubHomeDir(options.projectPath);
  }

  if (options.stubHomeDir) {
    stubs.stubCWD(options.stubHomeDir);
  }

  if (options.setEnv) {
    // sets any env specified
    console.log('env not implemented');
  }

  if (isLeftovers() && fs.existsSync(options.projectPath)) {
    // checks leftover mode...only continues the build process IF the projectDir isn't there.
    return { ...output, usedLeftovers: true, status: 0 };
  }

  if (options.projectSource) {
    // if github, then clone
    if (options.projectSource.includes('https://github.com')) {
      shelljs.exec(`git clone ${options.projectSource} ${options.projectPath}`);
    }
    // if local path, then copy
    shelljs.cp('r', options.projectSource, options.projectPath);
  } else {
    shelljs.exec(`sfdx force:project:create -n ${options.projectPath}`);
  }

  if (options.setupCommands) {
    for (const cmd of options.setupCommands) {
      shelljs.exec(cmd);
    }
  }
  return { ...output, usedLeftovers: false, status: 0 };
};

export const tearDown = async (projectPath: string): Promise<void> => {
  if (isLeftovers()) {
    return;
  }
  await orgDelete(projectPath);
  shelljs.rm(projectPath);
  stubs.restoreAll();
  // TODO: something about unsetting env vars?
};

export const orgDelete = async (testProjectName: string): Promise<void> => {
  // TODO per Steve: readJSON the project's sfdx files to get the org(s) and delete them so we don't have to depend on -s
  // get the username from local config and use that to delete.  This depends on org:create having run with -s
  const username = ((parseJson(
    shelljs.exec('sfdx config:get defaultusername --json', { cwd: testProjectName })
  ) as unknown) as ConfigGetReturn).result.find((item) => item.location === 'Local')?.value;
  if (username) {
    shelljs.exec(`sfdx force:org:delete -u ${username} -p --json`);
    return;
  }
  throw new Error(`no default username for ${testProjectName} found`);
};

interface ConfigGetReturn {
  status: number;
  result: [
    {
      key: string;
      location: 'Global' | 'Local';
      value: string;
      path: string;
    }
  ];
}
