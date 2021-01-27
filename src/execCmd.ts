/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { exec, ExecOptions, ShellString } from 'shelljs';
import Debug from 'debug';
import { inspect } from 'util';
import { AnyJson, isNumber } from '@salesforce/ts-types';
import { parseJson } from '@salesforce/kit';

export interface ExecCmdOptions extends ExecOptions {
  /**
   * Also return command result in this format.
   */
  resultFormat?: 'json';
  
  /**
   * Throws if this exit code is not returned.
   */
  ensureExitCode?: number;
};

export interface ExecCmdResult {
  /**
   * Command output from the shell.
   * @see https://www.npmjs.com/package/shelljs#execcommand--options--callback
   */
  shellOutput: ShellString;

  /**
   * Command output parsed as JSON, if resultFormat == "json" .
   */
  jsonOutput?: AnyJson;

  /**
   * The JsonParseError if parsing failed.
   */
  jsonError?: Error;

  /**
   * Command execution time in seconds.
   */
  execTimeSecs: number;
}

/**
 * Synchronously execute a command with the provided options in a child process.
 * 
 * Option defaults:
 *    1. `cwd` = process.cwd()
 *    2. `timeout` = 300000 (5 minutes)
 *    3. `env` = process.env
 * 
 * Other defaults:
 *    @see https://www.npmjs.com/package/shelljs#execcommand--options--callback
 *    @see https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback
 * 
 * @param cmd The command string to be executed by a child process.
 * @param options The options used to run the command and affect output.
 * @returns ExecCmdResult
 */
export const execCmd = (cmd: string, options: ExecCmdOptions = {}): ExecCmdResult => {
  const debug = Debug(`testkit:execCmd`);

  // Ensure we run synchronously
  if (options.async) {
    throw new Error('execCmd must be run synchronously.  Use execCmdAsync instead.');
  }

  const defaultShellOptions = {
    timeout: 300000, // 5 minutes
    cwd: process.cwd(),
    env: Object.assign({}, process.env)
  };
  const cmdOptions = Object.assign(defaultShellOptions, options);
 
  debug(`Running cmd: ${cmd} from ${cmdOptions.cwd}`);
  debug(`Cmd options: ${inspect(cmdOptions)}`);

  const result: ExecCmdResult = {
    shellOutput: '' as ShellString,
    execTimeSecs: 0
  };

  let status: 'SUCCESS' | 'ERROR';
  const startTime = process.hrtime();

  // Execute the command in a synchronous child process
  result.shellOutput = exec(cmd, cmdOptions) as ShellString;

  result.execTimeSecs = process.hrtime(startTime)[0];
  status = result.shellOutput.code === 0 ? 'SUCCESS' : 'ERROR';
  debug(`Command completed in: ${result.execTimeSecs}s with status: ${status}`);

  if (isNumber(cmdOptions.ensureExitCode) && result.shellOutput.code !== cmdOptions.ensureExitCode) {
    throw new Error(`Unexpected exit code for command: ${cmd}`);
  }

  // Add JSON output if requested
  if (options.resultFormat?.toLowerCase() === 'json') {
    try {
      result.jsonOutput = parseJson(result.shellOutput.stdout);
    } catch (parseErr) {
      result.jsonError = parseErr;
    }
  }

  return result;
}
