/*
 * Copyright (c) 2021, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import * as fs from 'node:fs';
import { spawn, SpawnOptionsWithoutStdio } from 'node:child_process';
import { join as pathJoin, resolve as pathResolve } from 'node:path';
import { inspect } from 'node:util';
import { SfError } from '@salesforce/core';
import { Duration, env, parseJson } from '@salesforce/kit';
import { AnyJson, isNumber, Many } from '@salesforce/ts-types';
import Debug from 'debug';
import * as shelljs from 'shelljs';
import { ExecCallback, ExecOptions, ShellString } from 'shelljs';
import stripAnsi = require('strip-ansi');
import { genUniqueString } from './genUniqueString';

export type CLI = 'inherit' | 'sfdx' | 'sf' | 'dev';

type BaseExecOptions = {
  /**
   * Throws if this exit code is not returned by the child process.
   */
  ensureExitCode?: number | 'nonZero';

  /**
   * The executable that should be used for execCmd.
   * - inherit uses TESTKIT_EXECUTABLE_PATH to determine the executable. If it's not set it defaults to the local bin/dev
   * - sfdx refers to the globally installed sf executable
   * - sf refers to the globally installed sf executable
   */
  cli?: CLI;
};

export type ExecCmdOptions = ExecOptions &
  BaseExecOptions &
  // prevent the overriding of our default by passing in an explicitly undefined value for cwd
  ({ cwd: string } | { cwd?: never });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcludeMethods<T> = Pick<T, NonNullable<{ [K in keyof T]: T[K] extends (_: any) => any ? never : K }[keyof T]>>;

export type JsonOutput<T> = { status: number; result: T; warnings: string[] } & Partial<ExcludeMethods<SfError>>;

export type ExecCmdResult<T> = {
  /**
   * Command output parsed as JSON, if `--json` param present.
   */
  jsonOutput?: JsonOutput<T>;
  /**
   * Command output from the shell.
   *
   * @see https://www.npmjs.com/package/shelljs#execcommand--options--callback
   */
  shellOutput: ShellString;
  /**
   * The JsonParseError if parsing failed.
   */
  jsonError?: Error;

  /**
   * Command execution duration.
   */
  execCmdDuration: Duration;
}

const buildCmdOptions = (options?: ExecCmdOptions): ExecCmdOptions & { cwd: string } => {
  const defaults: ExecCmdOptions = {
    env: { ...process.env, ...options?.env },
    cwd: process.cwd(),
    timeout: Duration.hours(1).milliseconds, // 1 hour
    silent: true,
    cli: 'inherit',
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
const addJsonOutput = <T>(cmd: string, result: ExecCmdResult<T>, file: string): ExecCmdResult<T> => {
  if (cmd.includes('--json')) {
    try {
      result.jsonOutput = parseJson(stripAnsi(fs.readFileSync(file, 'utf-8'))) as unknown as JsonOutput<T>;
    } catch (parseErr: unknown) {
      result.jsonError = parseErr as Error;
    }
  }
  return result;
};

const getExitCodeError = (cmd: string, expectedCode: number | 'nonZero', output: ShellString) => {
  const errorDetails =
    output.stdout || output.stderr
      ? // return details if they exist
        `\nstdout=${output.stdout}\nstderr=${output.stderr}`
      : // or the raw string if there are no details
        `\n${output}`;
  return Error(
    `Unexpected exit code for command: ${cmd}. Expected: ${expectedCode} Actual: ${output.code} ${errorDetails}`
  );
};

/**
 * Determine the executable path for use by `execCmd`.
 *
 * If the cli is 'inherit', the executable preference order is:
 *    1. TESTKIT_EXECUTABLE_PATH env var
 *    2. `bin/run.js` (default)
 *
 * @returns The command string with CLI executable. E.g., `"node_modules/bin/sf org:create:user -a testuser1"`
 */
export const determineExecutable = (cli: CLI = 'inherit'): string => {
  const debug = Debug('testkit:determineExecutable');

  let bin: string | undefined;
  const root = Cache.getInstance().get('pluginDir') ?? process.cwd();
  switch (cli) {
    case 'inherit':
      bin =
        env.getString('TESTKIT_EXECUTABLE_PATH') ??
        pathJoin(root, 'bin', process.platform === 'win32' ? 'run.cmd' : 'run.js');
      break;
    case 'dev':
      bin =
        env.getString('TESTKIT_EXECUTABLE_PATH') ??
        pathJoin(root, 'bin', process.platform === 'win32' ? 'dev.cmd' : 'dev.js');
      break;
    case 'sfdx':
      bin = cli;
      break;
    case 'sf':
      bin = cli;
      break;
  }

  // Support plugins who still use bin/run instead of bin/run.js
  if (bin.endsWith('.js') && !fs.existsSync(bin)) bin = bin.replace('.js', '');
  const which = shelljs.which(bin);
  let resolvedPath = pathResolve(bin);

  // If 'which' finds the path in the system path, use that.
  if (which) {
    resolvedPath = which;
  } else if (!fs.existsSync(bin)) {
    throw new Error(`Cannot find specified executable path: ${bin}`);
  }

  debug(`Resolved executable path: ${resolvedPath}`);
  debug(`Using executable path: ${bin}`);
  return bin;
};

const buildCmd = (cmdArgs: string, options?: ExecCmdOptions): string => {
  const bin = determineExecutable(options?.cli);
  return `${bin} ${cmdArgs}`;
};

const execCmdSync = <T>(cmd: string, options?: ExecCmdOptions): ExecCmdResult<T> => {
  const debug = Debug('testkit:execCmd');

  // Add on the bin path
  cmd = buildCmd(cmd, options);
  const cmdOptions = buildCmdOptions(options);

  debug(`Running cmd: ${cmd}`);
  debug(`Cmd options: ${inspect(cmdOptions)}`);

  const stdoutFile = `${genUniqueString('stdout')}.txt`;
  const stderrFile = `${genUniqueString('stderr')}.txt`;
  const stdoutFileLocation = pathJoin(cmdOptions.cwd, stdoutFile);
  const stderrFileLocation = pathJoin(cmdOptions.cwd, stderrFile);

  const result = {
    shellOutput: new ShellString(''),
    execCmdDuration: Duration.seconds(0),
  } as ExecCmdResult<T>;

  // Execute the command in a synchronous child process
  const startTime = process.hrtime();
  const code = (shelljs.exec(`${cmd} 1> ${stdoutFile} 2> ${stderrFile} `, cmdOptions) as ShellString).code;

  // capture the output for both stdout and stderr
  result.shellOutput = new ShellString(stripAnsi(fs.readFileSync(stdoutFileLocation, 'utf-8')));
  result.shellOutput.stdout = stripAnsi(result.shellOutput.stdout);
  const shellStringForStderr = new ShellString(stripAnsi(fs.readFileSync(stderrFileLocation, 'utf-8')));
  // The ShellString constructor sets the argument as stdout, so we strip 'stdout' and set as stderr
  result.shellOutput.stderr = stripAnsi(shellStringForStderr.stdout);

  result.shellOutput.code = code;

  result.execCmdDuration = hrtimeToMillisDuration(process.hrtime(startTime));
  debug(`Command completed with exit code: ${result.shellOutput.code}`);

  if (isNumber(cmdOptions.ensureExitCode) && result.shellOutput.code !== cmdOptions.ensureExitCode) {
    throw getExitCodeError(cmd, cmdOptions.ensureExitCode, result.shellOutput);
  }

  if (cmdOptions.ensureExitCode === 'nonZero' && result.shellOutput.code === 0) {
    throw getExitCodeError(cmd, cmdOptions.ensureExitCode, result.shellOutput);
  }

  const withJson = addJsonOutput<T>(cmd, result, stdoutFileLocation);
  fs.rmSync(stderrFileLocation);
  fs.rmSync(stdoutFileLocation);
  return withJson;
};

const execCmdAsync = async <T>(cmd: string, options: ExecCmdOptions): Promise<ExecCmdResult<T>> => {
  const debug = Debug('testkit:execCmdAsync');

  // Add on the bin path
  cmd = buildCmd(cmd, options);

  return new Promise<ExecCmdResult<T>>((resolve, reject) => {
    const cmdOptions = buildCmdOptions(options);

    debug(`Running cmd: ${cmd}`);
    debug(`Cmd options: ${inspect(cmdOptions)}`);
    // buildCmdOptions will always
    const stdoutFileLocation = pathJoin(cmdOptions.cwd, `${genUniqueString('stdout')}.txt`);
    const stderrFileLocation = pathJoin(cmdOptions.cwd, `${genUniqueString('stderr')}.txt`);
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
        shellOutput: new ShellString(fs.readFileSync(stdoutFileLocation, 'utf-8')),
        execCmdDuration,
      } as ExecCmdResult<T>;
      result.shellOutput.code = code;

      if (code === 0) {
        result.shellOutput = new ShellString(stripAnsi(fs.readFileSync(stdoutFileLocation, 'utf-8')));
        result.shellOutput.stdout = stripAnsi(result.shellOutput.stdout);
      } else {
        result.shellOutput = new ShellString(stripAnsi(fs.readFileSync(stderrFileLocation, 'utf-8')));
        // The ShellString constructor sets the argument as stdout, so we strip 'stdout' and set as stderr
        result.shellOutput.stderr = stripAnsi(result.shellOutput.stdout);
      }

      const addJson = addJsonOutput<T>(cmd, result, stdoutFileLocation);
      fs.rmSync(stdoutFileLocation);
      fs.rmSync(stderrFileLocation);
      resolve(addJson);
    };
    // Execute the command async in a child process
    const startTime = process.hrtime();
    shelljs.exec(`${cmd} 1> ${stdoutFileLocation} 2> ${stderrFileLocation}`, cmdOptions, callback);
  });
};

/**
 * Synchronously execute a command with the provided options in a child process.
 *
 * Option defaults:
 *    1. `cwd` = process.cwd()
 *    2. `timeout` = 3,600,000 (1 hour)
 *    3. `env` = process.env
 *    4. `silent` = true (child process output not written to the console)
 *    5. `cli` = 'inherit' (use the TESTKIT_EXECUTABLE_PATH env var or `bin/dev` if not set for executing commands)
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
export function execCmd<T = AnyJson>(cmd: string, options?: ExecCmdOptions & { async?: false }): ExecCmdResult<T>;

export function execCmd<T = AnyJson>(cmd: string, options: ExecCmdOptions & { async: true }): Promise<ExecCmdResult<T>>;

export function execCmd<T = AnyJson>(
  cmd: string,
  options?: ExecCmdOptions
): ExecCmdResult<T> | Promise<ExecCmdResult<T>> {
  if (options?.async) {
    return execCmdAsync<T>(cmd, options);
  } else {
    return execCmdSync<T>(cmd, options);
  }
}

function toString(arrOrString: Many<string>): string {
  if (Array.isArray(arrOrString)) {
    return arrOrString.join('');
  }
  return arrOrString;
}

function toArray(arrOrString: Many<string>): string[] {
  if (Array.isArray(arrOrString)) {
    return arrOrString;
  }
  return [arrOrString];
}

export enum Interaction {
  DOWN = '\x1B\x5B\x42',
  UP = '\x1B\x5B\x41',
  ENTER = '\x0D',
  SELECT = ' ',
  Yes = 'Y' + '\x0D',
  No = 'N' + '\x0D',
  BACKSPACE = '\x08',
  ALL = 'a',
}

export type InteractiveCommandExecutionResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  duration: Duration;
};

export type InteractiveCommandExecutionOptions = BaseExecOptions & SpawnOptionsWithoutStdio;

/**
 * A map of questions and answers to be used in an interactive command.
 *
 * The questions are strings that will be used to match the question asked by the command.
 */
export type PromptAnswers = Record<string, Many<string>>;

/**
 * Execute an interactive command.
 *
 * @example
 * ```
 * import { TestSession, execInteractiveCmd, Interaction } from '@salesforce/cli-plugins-testkit';
 *
 * const result = await execInteractiveCmd(
 *    'dev generate plugin',
 *    {
 *      'internal Salesforce team': Interaction.Yes,
 *      'name of your new plugin': ['plugin-awesome', Interaction.ENTER],
 *      'description for your plugin': ['a description', Interaction.ENTER],
 *      'Select the existing "sf" commands you plan to extend': [
 *        Interaction.SELECT,
 *        Interaction.DOWN,
 *        Interaction.SELECT,
 *        Interaction.ENTER,
 *      ],
 *    },
 *    { cwd: session.dir, ensureExitCode: 0 }
 *  );
 * ```
 */
export async function execInteractiveCmd(
  command: string,
  answers: PromptAnswers,
  options: InteractiveCommandExecutionOptions = {}
): Promise<InteractiveCommandExecutionResult> {
  const debug = Debug('testkit:execInteractiveCmd');

  return new Promise((resolve, reject) => {
    const bin = determineExecutable(options?.cli).trim();
    const startTime = process.hrtime();
    const opts =
      process.platform === 'win32'
        ? { shell: true, cwd: process.cwd(), ...options }
        : { cwd: process.cwd(), ...options };
    const child = spawn(bin, command.split(' '), opts);
    child.stdin.setDefaultEncoding('utf-8');

    const seen = new Set<string>();
    const output = {
      stdout: [] as string[],
      stderr: [] as string[],
    };

    const scrollLimit = env.getNumber('TESTKIT_SCROLL_LIMIT', 1000) ?? 1000;
    let scrollCount = 0;

    const handleData = (data: Buffer, stream: 'stdout' | 'stderr') => {
      if (scrollCount > scrollLimit) {
        reject(new Error(`Scroll limit of ${scrollLimit} reached`));
      }

      const current = data.toString();
      debug(`${stream}: ${current}`);
      output[stream].push(current);

      const matchingQuestion = Object.keys(answers)
        .filter((key) => !seen.has(key))
        .find((key) => new RegExp(key).test(current));

      if (!matchingQuestion) return;

      const answerString = toString(answers[matchingQuestion]);
      const answerArray = toArray(answers[matchingQuestion]);

      // If the answer includes a string that's NOT an Interactive enum value, then we need to scroll to it.
      const scrollTarget = answerArray.find((answer) => !(Object.values(Interaction) as string[]).includes(answer));
      const shouldScrollForAnswer = current.includes('❯') && scrollTarget;

      if (shouldScrollForAnswer) {
        // recent inquirer versions include a unicode character in the prompt that we need to strip out
        // it's something like a backspace or a backline character used to type over existing output
        // this generally removes all the "control" characters in the first section of unicode
        const regex = /(?<=❯\s)([\u0020-\u00d7ff]+)/g;
        const selected = (current.match(regex) ?? [''])[0].trim();
        if (selected === scrollTarget) {
          seen.add(matchingQuestion);
          child.stdin.write(Interaction.ENTER);
        } else {
          scrollCount += 1;
          child.stdin.write(Interaction.DOWN);
        }
      } else {
        seen.add(matchingQuestion);
        scrollCount = 0;
        child.stdin.write(answerString);
      }
    };

    child.stdout.on('data', (data: Buffer) => handleData(data, 'stdout'));
    child.stderr.on('data', (data: Buffer) => handleData(data, 'stderr'));

    child.on('close', (code) => {
      debug(`child process exited with code ${code}`);
      child.stdin.end();

      const result = {
        code,
        stdout: stripAnsi(output.stdout.join('\n')),
        stderr: stripAnsi(output.stderr.join('\n')),
        duration: hrtimeToMillisDuration(process.hrtime(startTime)),
      };

      if (isNumber(options.ensureExitCode) && code !== options.ensureExitCode) {
        reject(
          getExitCodeError(command, options.ensureExitCode, {
            stdout: result.stdout,
            stderr: result.stderr,
            code: result.code,
          } as ShellString)
        );
      }

      resolve(result);
    });
  });
}

export class Cache extends Map<string, string> {
  private static instance: Cache;

  public static getInstance(): Cache {
    if (!Cache.instance) {
      Cache.instance = new Cache();
    }
    return Cache.instance;
  }
}
