/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { join as pathJoin, resolve as pathResolve } from 'path';
import { inspect } from 'util';
import { fs, SfdxError } from '@salesforce/core';
import { Duration, env, parseJson } from '@salesforce/kit';
import { AnyJson, isNumber } from '@salesforce/ts-types';
import Debug from 'debug';
import * as shelljs from 'shelljs';
import { ExecCallback, ExecOptions, ShellString } from 'shelljs';

import stripAnsi = require('strip-ansi');

type Collection = Record<string, AnyJson> | Array<Record<string, AnyJson>>;

export interface ExecCmdOptions extends ExecOptions {
  /**
   * Throws if this exit code is not returned by the child process.
   */
  ensureExitCode?: number;

  /**
   * The base CLI that the plugin is used in. This is used primarily for changing the behavior
   * of JSON parsing and types.
   */
  cli?: 'sfdx' | 'sf';

  /**
   * Answers to supply to any prompts. This does NOT work on windows.
   */
  answers?: string[];
}

export interface ExecCmdResult {
  /**
   * Command output from the shell.
   *
   * @see https://www.npmjs.com/package/shelljs#execcommand--options--callback
   */
  shellOutput: ShellString;

  jsonOutput?: unknown;

  /**
   * The JsonParseError if parsing failed.
   */
  jsonError?: Error;

  /**
   * Command execution duration.
   */
  execCmdDuration: Duration;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcludeMethods<T> = Pick<T, NonNullable<{ [K in keyof T]: T[K] extends (_: any) => any ? never : K }[keyof T]>>;

export interface SfdxExecCmdResult<T = Collection> extends ExecCmdResult {
  /**
   * Command output parsed as JSON, if `--json` param present.
   */
  jsonOutput?: { status: number; result: T } & Partial<ExcludeMethods<SfdxError>>;
}

export interface SfExecCmdResult<T = Collection> extends ExecCmdResult {
  /**
   * Command output parsed as JSON, if `--json` param present.
   */
  jsonOutput?: { status: number; result: T } & Partial<ExcludeMethods<SfdxError>>;
}

const DEFAULT_EXEC_OPTIONS: ExecCmdOptions = {
  cli: 'sfdx',
};

const buildCmdOptions = (options?: ExecCmdOptions): ExecCmdOptions => {
  const defaults: shelljs.ExecOptions = {
    env: Object.assign({}, process.env),
    cwd: process.cwd(),
    timeout: 300000, // 5 minutes
    silent: true,
  };
  const shellOverride = env.getString('TESTKIT_EXEC_SHELL');
  if (shellOverride) {
    defaults.shell = shellOverride;
  }
  return { ...defaults, ...options };
};

// Create a Duration instance from process.hrtime
const hrtimeToMillisDuration = (hrTime: [number, number]) =>
  Duration.milliseconds(hrTime[0] * Duration.MILLIS_IN_SECONDS + hrTime[1] / 1e6);

// Add JSON output if json flag is set
const addJsonOutput = <T extends ExecCmdResult, U>(cmd: string, result: T): T => {
  if (cmd.includes('--json')) {
    try {
      result.jsonOutput = parseJson(stripAnsi(result.shellOutput.stdout)) as unknown as U;
    } catch (parseErr: unknown) {
      result.jsonError = parseErr as Error;
    }
  }
  return result;
};

const getExitCodeError = (cmd: string, expectedCode: number, output: ShellString) => {
  const io = cmd.includes('--json') ? output.stdout : output.stderr;
  return Error(`Unexpected exit code for command: ${cmd}. Expected: ${expectedCode} Actual: ${output.code}\n${io}`);
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
const buildCmd = (cmdArgs: string, options?: ExecCmdOptions): string => {
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
  if (options?.answers && process.platform !== 'win32') {
    return `printf "${options.answers.join('\\n')}" | ${bin} ${cmdArgs}`;
  } else {
    return `${bin} ${cmdArgs}`;
  }
};

const execCmdSync = <T extends ExecCmdResult, U = Collection>(cmd: string, options?: ExecCmdOptions): T => {
  const debug = Debug('testkit:execCmd');

  // Add on the bin path
  cmd = buildCmd(cmd, options);
  const cmdOptions = buildCmdOptions(options);

  debug(`Running cmd: ${cmd}`);
  debug(`Cmd options: ${inspect(cmdOptions)}`);

  const result = {
    shellOutput: '' as ShellString,
    execCmdDuration: Duration.seconds(0),
  } as T;

  // Execute the command in a synchronous child process
  const startTime = process.hrtime();
  result.shellOutput = shelljs.exec(cmd, cmdOptions) as ShellString;
  result.shellOutput.stdout = stripAnsi(result.shellOutput.stdout);
  result.shellOutput.stderr = stripAnsi(result.shellOutput.stderr);
  result.execCmdDuration = hrtimeToMillisDuration(process.hrtime(startTime));
  debug(`Command completed with exit code: ${result.shellOutput.code}`);

  if (isNumber(cmdOptions.ensureExitCode) && result.shellOutput.code !== cmdOptions.ensureExitCode) {
    throw getExitCodeError(cmd, cmdOptions.ensureExitCode, result.shellOutput);
  }

  return addJsonOutput<T, U>(cmd, result);
};

const execCmdAsync = async <T extends ExecCmdResult, U = Collection>(
  cmd: string,
  options: ExecCmdOptions
): Promise<T> => {
  const debug = Debug('testkit:execCmdAsync');

  // Add on the bin path
  cmd = buildCmd(cmd, options);

  const resultPromise = new Promise<T>((resolve, reject) => {
    const cmdOptions = buildCmdOptions(options);

    debug(`Running cmd: ${cmd}`);
    debug(`Cmd options: ${inspect(cmdOptions)}`);

    const callback: ExecCallback = (code, stdout, stderr) => {
      const execCmdDuration = hrtimeToMillisDuration(process.hrtime(startTime));
      debug(`Command completed with exit code: ${code}`);

      if (isNumber(cmdOptions.ensureExitCode) && code !== cmdOptions.ensureExitCode) {
        const output = new ShellString(stdout);
        output.code = code;
        output.stderr = stderr;
        reject(getExitCodeError(cmd, cmdOptions.ensureExitCode, output));
      }

      const result = {
        shellOutput: new ShellString(stdout),
        execCmdDuration,
      } as T;
      result.shellOutput.code = code;
      result.shellOutput.stdout = stripAnsi(stdout);
      result.shellOutput.stderr = stripAnsi(stderr);

      resolve(addJsonOutput<T, U>(cmd, result));
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
export function execCmd<T = Collection>(
  cmd: string,
  options?: ExecCmdOptions & { async?: false; cli?: 'sfdx' }
): SfdxExecCmdResult<T>;

export function execCmd<T = Collection>(
  cmd: string,
  options?: ExecCmdOptions & { async?: false; cli?: 'sf' }
): SfExecCmdResult<T>;

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
export function execCmd<T = Collection>(
  cmd: string,
  options: ExecCmdOptions & { async: true; cli?: 'sfdx' }
): Promise<SfdxExecCmdResult<T>>;

export function execCmd<T = Collection>(
  cmd: string,
  options: ExecCmdOptions & { async: true; cli?: 'sf' }
): Promise<SfExecCmdResult<T>>;

export function execCmd<T = Collection>(
  cmd: string,
  options: ExecCmdOptions = DEFAULT_EXEC_OPTIONS
): SfdxExecCmdResult<T> | Promise<SfdxExecCmdResult<T>> | SfExecCmdResult<T> | Promise<SfExecCmdResult<T>> {
  if (options.cli === 'sf') {
    if (options.async) {
      return execCmdAsync<SfExecCmdResult<T>, T>(cmd, options);
    } else {
      return execCmdSync<SfExecCmdResult<T>, T>(cmd, options);
    }
  } else {
    if (options.async) {
      return execCmdAsync<SfdxExecCmdResult<T>, T>(cmd, options);
    } else {
      return execCmdSync<SfdxExecCmdResult<T>, T>(cmd, options);
    }
  }
}
