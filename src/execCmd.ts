/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join } from 'path';
import { inspect } from 'util';
import { fs as fsCore } from '@salesforce/core';
import { Duration, env, parseJson } from '@salesforce/kit';
import { AnyJson, isNumber } from '@salesforce/ts-types';
import Debug from 'debug';
import * as shelljs from 'shelljs';
import { ExecCallback, ExecOptions, ShellString } from 'shelljs';

export interface ExecCmdOptions extends ExecOptions {
  /**
   * Throws if this exit code is not returned by the child process.
   */
  ensureExitCode?: number;
}

export interface ExecCmdResult {
  /**
   * Command output from the shell.
   *
   * @see https://www.npmjs.com/package/shelljs#execcommand--options--callback
   */
  shellOutput: ShellString;

  /**
   * Command output parsed as JSON, if `--json` param present.
   */
  jsonOutput?: AnyJson;

  /**
   * The JsonParseError if parsing failed.
   */
  jsonError?: Error;

  /**
   * Command execution duration.
   */
  execCmdDuration: Duration;
}

const DEFAULT_SHELL_OPTIONS = {
  timeout: 300000, // 5 minutes
  cwd: process.cwd(),
  env: Object.assign({}, process.env),
  silent: true,
};

// Create a Duration instance from process.hrtime
const hrtimeToMillisDuration = (hrTime: [number, number]) =>
  Duration.milliseconds(hrTime[0] * Duration.MILLIS_IN_SECONDS + hrTime[1] / 1e6);

// Add JSON output if json flag is set
const addJsonOutput = (cmd: string, result: ExecCmdResult): ExecCmdResult => {
  if (cmd.includes('--json')) {
    try {
      result.jsonOutput = parseJson(result.shellOutput.stdout);
    } catch (parseErr: unknown) {
      result.jsonError = parseErr as Error;
    }
  }
  return result;
};

const getExitCodeError = (expectedCode: number, actualCode: number, cmd: string) => {
  return Error(`Unexpected exit code for command: ${cmd}. Expected: ${expectedCode} Actual: ${actualCode}`);
};

/**
 * Synchronously execute a command with the provided options in a child process.
 *
 * Option defaults:
 *    1. `cwd` = process.cwd()
 *    2. `timeout` = 300000 (5 minutes)
 *    3. `env` = process.env
 *    4. `silent` = true (child process output not written to the console)
 *
 * Other defaults:
 *
 *    @see www.npmjs.com/package/shelljs#execcommand--options--callback
 *    @see www.nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback
 *
 * @param cmd The command string to be executed by a child process.
 * @param options The options used to run the command.
 * @returns The child process exit code, stdout, stderr, cmd run time, and the parsed JSON if `--json` param present.
 */
export const execCmd = (cmd: string, options: ExecCmdOptions = {}): ExecCmdResult => {
  const debug = Debug('testkit:execCmd');

  // Ensure we run synchronously
  if (options.async) {
    throw new Error('execCmd must be run synchronously.  Use execCmdAsync to run asynchronously.');
  }

  const cmdOptions = Object.assign({}, DEFAULT_SHELL_OPTIONS, options);

  debug(`Running cmd: ${cmd}`);
  debug(`Cmd options: ${inspect(cmdOptions)}`);

  const result: ExecCmdResult = {
    shellOutput: '' as ShellString,
    execCmdDuration: Duration.seconds(0),
  };

  // Execute the command in a synchronous child process
  const startTime = process.hrtime();
  result.shellOutput = shelljs.exec(cmd, cmdOptions) as ShellString;
  result.execCmdDuration = hrtimeToMillisDuration(process.hrtime(startTime));
  debug(`Command completed with exit code: ${result.shellOutput.code}`);

  if (isNumber(cmdOptions.ensureExitCode) && result.shellOutput.code !== cmdOptions.ensureExitCode) {
    throw getExitCodeError(cmdOptions.ensureExitCode, result.shellOutput.code, cmd);
  }

  return addJsonOutput(cmd, result);
};

/**
 * Asynchronously execute a command with the provided options in a child process.
 *
 * Option defaults:
 *    1. `cwd` = process.cwd()
 *    2. `timeout` = 300000 (5 minutes)
 *    3. `env` = process.env
 *    4. `silent` = true (child process output not written to the console)
 *
 * Other defaults:
 *
 *    @see www.npmjs.com/package/shelljs#execcommand--options--callback
 *    @see www.nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback
 *
 * @param cmd The command string to be executed by a child process.
 * @param options The options used to run the command.
 * @returns The child process exit code, stdout, stderr, cmd run time, and the parsed JSON if `--json` param present.
 */
export const execCmdAsync = async (cmd: string, options: ExecCmdOptions = {}): Promise<ExecCmdResult> => {
  const debug = Debug('testkit:execCmdAsync');

  const resultPromise = new Promise<ExecCmdResult>((resolve, reject) => {
    // Ensure we run asynchronously
    if (options.async === false) {
      reject(new Error('execCmdAsync must be run asynchronously.  Use execCmd to run synchronously.'));
    }

    const cmdOptions = Object.assign({}, DEFAULT_SHELL_OPTIONS, options);

    debug(`Running cmd: ${cmd}`);
    debug(`Cmd options: ${inspect(cmdOptions)}`);

    const callback: ExecCallback = (code, stdout, stderr) => {
      const execCmdDuration = hrtimeToMillisDuration(process.hrtime(startTime));
      debug(`Command completed with exit code: ${code}`);

      if (isNumber(cmdOptions.ensureExitCode) && code !== cmdOptions.ensureExitCode) {
        reject(getExitCodeError(cmdOptions.ensureExitCode, code, cmd));
      }

      const result: ExecCmdResult = {
        shellOutput: new ShellString(stdout),
        execCmdDuration,
      };
      result.shellOutput.code = code;
      result.shellOutput.stdout = stdout;
      result.shellOutput.stderr = stderr;

      resolve(addJsonOutput(cmd, result));
    };

    // Execute the command async in a child process
    const startTime = process.hrtime();
    shelljs.exec(cmd, cmdOptions, callback);
  });

  return resultPromise;
};

/**
 * Build a command string using an optional binary path for use by
 * execCmd or execCmdAsync.
 *
 * The binary preference order is:
 *    1. binaryPath arg
 *    2. TESTKIT_BINARY_PATH env var
 *    3. `bin/run` (default)
 *
 * @param cmdArgs The command name and args as a string. E.g., `"force:user:create -a testuser1"`
 * @param binaryPath The path to a command executable. E.g., `"node_modules/bin/sfdx"`
 * @returns The command string with CLI binary. E.g., `"node_modules/bin/sfdx force:user:create -a testuser1"`
 */
export const buildCmd = (cmdArgs: string, binaryPath?: string): string => {
  const debug = Debug('testkit:buildCmd');

  const verifyBinaryPath = (path: string) => {
    if (path && path !== 'sfdx' && !fsCore.fileExistsSync(path)) {
      throw new Error(`Cannot find specified binary path: ${path}`);
    }
  };

  const bin = binaryPath || env.getString('TESTKIT_BINARY_PATH') || join('bin', 'run');
  verifyBinaryPath(bin);
  debug(`Using binary: ${bin}`);

  return `${bin} ${cmdArgs}`;
};
