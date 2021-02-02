/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join as pathJoin, resolve as pathResolve } from 'path';
import { inspect } from 'util';
import { fs } from '@salesforce/core';
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
 * Build a command string using an optional executable path for use by `execCmd`.
 *
 * The executable preference order is:
 *    2. TESTKIT_EXECUTABLE_PATH env var
 *    3. `bin/run` (default)
 *
 * @param cmdArgs The command name, args, and param as a string. E.g., `"force:user:create -a testuser1"`
 * @returns The command string with CLI executable. E.g., `"node_modules/bin/sfdx force:user:create -a testuser1"`
 */
const buildCmd = (cmdArgs: string): string => {
  const debug = Debug('testkit:buildCmd');

  const bin = env.getString('TESTKIT_EXECUTABLE_PATH') || pathJoin('bin', 'run');
  const which = shelljs.which(bin);
  let resolvedPath = pathResolve(bin);

  // If which finds the path in the system path, use that.
  if (which) {
    resolvedPath = which;
  } else if (!fs.fileExistsSync(bin)) {
    throw new Error(`Cannot find specified executable path: ${bin}`);
  }

  debug(`Using executable path: ${bin}`);
  debug(`Resolved executable path: ${resolvedPath}`);

  return `${bin} ${cmdArgs}`;
};

const execCmdSync = (cmd: string, options?: ExecCmdOptions): ExecCmdResult => {
  const debug = Debug('testkit:execCmd');

  // Add on the bin path
  cmd = buildCmd(cmd);

  const cmdOptions = { ...DEFAULT_SHELL_OPTIONS, ...options };

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

const execCmdAsync = async (cmd: string, options: ExecCmdOptions): Promise<ExecCmdResult> => {
  const debug = Debug('testkit:execCmdAsync');

  // Add on the bin path
  cmd = buildCmd(cmd);

  const resultPromise = new Promise<ExecCmdResult>((resolve, reject) => {
    const cmdOptions = { ...DEFAULT_SHELL_OPTIONS, ...options };

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
export function execCmd(cmd: string, options?: ExecCmdOptions & { async?: false }): ExecCmdResult;

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
export function execCmd(cmd: string, options: ExecCmdOptions & { async: true }): Promise<ExecCmdResult>;

export function execCmd(cmd: string, options?: ExecCmdOptions): ExecCmdResult | Promise<ExecCmdResult> {
  if (options?.async) {
    return execCmdAsync(cmd, options);
  } else {
    return execCmdSync(cmd, options);
  }
}
