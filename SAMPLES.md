<!--
WARNING: THIS IS A GENERATED FILE. DO NOT MODIFY DIRECTLY.  USE topics.json
-->

### execCmd Function

- [Testing plugin commands synchronously](#testing-plugin-commands-synchronously)
- [Testing plugin commands asynchronously](#testing-plugin-commands-asynchronously)
- [Testing plugin commands exit code](#testing-plugin-commands-exit-code)
- [Testing plugin commands with a specific Salesforce CLI executable](#testing-plugin-commands-with-a-specific-salesforce-cli-executable)
- [Testing plugin commands JSON output](#testing-plugin-commands-json-output)
- [Getting command execution times](#getting-command-execution-times)

### TestSession Class

- [Testing with generated sfdx project](#testing-with-generated-sfdx-project)
- [Testing with local sfdx project](#testing-with-local-sfdx-project)
- [Testing with git cloned sfdx project](#testing-with-git-cloned-sfdx-project)
- [Testing with no sfdx project](#testing-with-no-sfdx-project)
- [Override the location of a TestSession](#override-the-location-of-a-testsession)
- [Cleaning TestSessions](#cleaning-testsessions)
- [Archiving TestSessions](#archiving-testsessions)
- [Archiving TestSessions on test failure](#archiving-testsessions-on-test-failure)
- [Testing with setup commands](#testing-with-setup-commands)
- [Testing with scratch orgs](#testing-with-scratch-orgs)
- [Testing with multiple test projects](#testing-with-multiple-test-projects)
- [Testing with multiple scratch orgs](#testing-with-multiple-scratch-orgs)
- [Changing the process.cwd stub](#changing-the-process.cwd-stub)

### Environment Variables

- [Testkit Debug output](#testkit-debug-output)
- [Testing with existing devhub authentication](#testing-with-existing-devhub-authentication)
- [Testing with SFDX Auth URL](#testing-with-sfdx-auth-url)
- [Testing with JWT devhub authentication](#testing-with-jwt-devhub-authentication)
- [Reusing orgs during test runs](#reusing-orgs-during-test-runs)
- [Reusing projects during test runs](#reusing-projects-during-test-runs)
- [Using my actual homedir during test runs](#using-my-actual-homedir-during-test-runs)
- [Saving test artifacts after test runs](#saving-test-artifacts-after-test-runs)

### Best Practices

- [Testkit Best Practices](#testkit-best-practices)

---

# Using Testkit’s execCmd function

The execCmd function allows plugin commands to execute with a specific CLI executable, defaulting to the plugin’s `./bin/run`. It can automatically ensure a specific exit code and throw an error when that exit code is not returned. Commands can be executed synchronously or asynchronously. All command results exitCode, stdout, and stderr are returned. If the --json flag was provided the results will have the parsed JSON output. Command execution time is provided as a Duration object for easy manipulation.

## Testing plugin commands synchronously

**_Usecase: I have a plugin with commands that I want to run within tests synchronously using my plugin’s `./bin/run`._**

```typescript
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';

describe('Sample NUT', () => {
  it('should run sync commands', () => {
    const rv = execCmd('config:list');
    expect(rv.shellOutput).to.contain('successfully did something');
  });
});
```

## Testing plugin commands asynchronously

**_Usecase: I have a plugin with commands that I want to run within tests asynchronously._**

```typescript
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';

describe('Sample NUT', () => {
  it('should run async commands', async () => {
    const rv = await execCmd('config:list', { async: true });
    expect(rv.shellOutput).to.contain('successfully did something');
  });
});
```

## Testing plugin commands exit code

**_Usecase: I have a plugin with commands that I want to run and throw an error if a certain exit code is not returned automatically._**

```typescript
import { execCmd } from '@salesforce/cli-plugins-testkit';

describe('Sample NUT', () => {
  it('should ensure a specific exit code', () => {
    execCmd('config:list', { ensureExitCode: 0 });
  });
});
```

## Testing plugin commands with a specific Salesforce CLI executable

**_Usecase: I have a plugin with commands that I want to run with a specific Salesforce CLI executable rather than my plugin’s `./bin/run`._**

```typescript
import { execCmd } from '@salesforce/cli-plugins-testkit';

describe('Sample NUT', () => {
  // This would actually be set in the shell or CI environment.
  process.env.TESTKIT_EXECUTABLE_PATH = 'sfdx';

  it('should use the specified Salesforce CLI executable', () => {
    execCmd('config:list');
  });
});
```

## Testing plugin commands JSON output

**_Usecase: I have a plugin with commands that I want to run and have parsed JSON output returned for easy verification._**

```typescript
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';

// This would typically be imported from your command.
type ConfigResult = {
  key: string;
  location: string;
  value: string;
};

describe('Sample NUT', () => {
  it('should provide typed and parsed JSON output', () => {
    // Simply have your command use the --json flag and provide a type.
    const rv = execCmd<ConfigResult[]>('config:list --json').jsonOutput;
    expect(rv.result[0].key).equals('defaultdevhubusername');
  });
});
```

## Getting command execution times

**_Usecase: I want to ensure my plugin commands execute within an acceptable duration range._**

```typescript
import { execCmd } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';

describe('Sample NUT', () => {
  it('config:list should execute in less than 5 seconds', () => {
    const t1 = execCmd(`config:list`).execCmdDuration.milliseconds;
    const t2 = execCmd(`config:list`).execCmdDuration.milliseconds;
    const t3 = execCmd(`config:list`).execCmdDuration.milliseconds;
    const aveExecTime = (t1 + t2 + t3) / 3;
    expect(aveExecTime).to.be.lessThan(5000);
  });
});
```

---

# Using Testkit’s TestSession class

A TestSession provides conveniences to testing plugin commands with options to authenticate to a devhub, create scratch orgs, define SFDX test projects, stub the current working directory of a process, run a list of setup commands, archive the contents of a test session, and use a unique identifier.

## Testing with generated sfdx project

**_Usecase: I have a plugin with commands that require a SFDX project but the tests don’t care about the contents of the project._**

```typescript
import { execCmd, TestSession, TestProject } from '@salesforce/cli-plugins-testkit';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create({
      project: {
        name: 'MyTestProject',
      },
    });
  });

  it('should run a command from within a generated project', () => {
    execCmd('force:source:convert', { ensureExitCode: 0 });
  });

  after(async () => {
    await testSession?.clean();
  });
});
```

## Testing with local sfdx project

**_Usecase: I have a plugin with commands that require a SFDX project and the test project I want to use is in a local directory within my plugin repo._**

```typescript
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import * as path from 'path';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create({
      project: {
        sourceDir: path.join(process.cwd(), 'localTestProj'),
      },
    });
  });

  it('should run a command from within a locally copied project', () => {
    execCmd('config:list', { ensureExitCode: 0 });
  });

  after(async () => {
    await testSession?.clean();
  });
});
```

## Testing with git cloned sfdx project

**_Usecase: I have a plugin with commands that require a SFDX project and the test project I want to use is in a git repo._**

```typescript
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create({
      project: {
        gitClone: 'https://github.com/trailheadapps/ebikes-lwc.git',
      },
    });
  });

  it('should run a command from within a cloned github project', () => {
    execCmd('config:list', { ensureExitCode: 0 });
  });

  after(async () => {
    await testSession?.clean();
  });
});
```

## Testing with no sfdx project

**_Usecase: I have a plugin with commands that do not require a SFDX project but I want other things from a TestSession such as easy authentication to a devhub, setup commands, homedir stub, etc._**

```typescript
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create();
  });

  it('should allow access to anything on TestSession without a project', () => {
    execCmd(`config:set instanceUrl=${testSession.id}`, { ensureExitCode: 0 });
  });

  after(async () => {
    await testSession?.clean();
  });
});
```

## Override the location of a TestSession

**_Usecase: I want my tests to control the location of the TestSession._**

```typescript
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { expect } from 'chai';
import { tmpdir } from 'os';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create({
      // NOTE: you can also override with an env var.
      //       See section on Testkit env vars.
      sessionDir: tmpdir(),
    });
  });

  it('should use overridden session directory', () => {
    execCmd(`config:set instanceUrl=${testSession.id}`);
    expect(testSession.dir).to.equal(tmpdir());
  });

  after(async () => {
    await testSession?.clean();
  });
});
```

## Cleaning TestSessions

**_Usecase: I want to use TestSessions but clean everything when the tests are done running, including projects, scratch orgs, and the TestSession directory._**

```typescript
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create();
  });

  it('should delete projects, orgs, and the TestSession in after()', () => {
    execCmd('config:list', { ensureExitCode: 0 });
  });

  after(async () => {
    await testSession?.clean();
  });
});
```

## Archiving TestSessions

**_Usecase: I want to use TestSessions but zip the test session directory when the tests are done running._**

```typescript
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create();
  });

  it('should archive the TestSession contents in process.cwd()', () => {
    execCmd('config:list', { ensureExitCode: 0 });
  });

  // NOTE: Must set env var: TESTKIT_ENABLE_ZIP=true
  after(async () => {
    await testSession?.zip();
    await testSession?.clean();
  });
});
```

## Archiving TestSessions on test failure

**_Usecase: I want to use TestSessions but zip the test session directory when the tests fail._**

```typescript
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create();
  });

  it('should archive the TestSession contents in process.cwd() when a test fails', () => {
    execCmd(`config:set instanceUrl=${testSession.id}`, { ensureExitCode: 0 });
  });

  afterEach(async function () {
    if (this.currentTest?.state !== 'passed') {
      await testSession?.zip();
    }
  });

  after(async () => {
    await testSession?.clean();
  });
});
```

## Testing with setup commands

**_Usecase: I have a plugin with commands and tests require other commands to run for setup, and I want to reference the command results of the setup commands._**

```typescript
import { execCmd, TestSession, TestProject } from '@salesforce/cli-plugins-testkit';
import { getString } from '@salesforce/ts-types';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create({
      project: {
        name: 'MyTestProject',
      },
      setupCommands: ['sfdx force:org:create edition=Developer', 'sfdx force:source:push'],
    });
  });

  it('using testkit to run commands with an org', () => {
    const username = getString(testSession.setup[0], 'result.username');
    execCmd(`user:create -u ${username}`, { ensureExitCode: 0 });
  });

  after(async () => {
    await testSession?.clean();
  });
});
```

## Testing with scratch orgs

**_Usecase: I have a plugin with commands that require an org._**

```typescript
import { execCmd, TestSession, TestProject } from '@salesforce/cli-plugins-testkit';
import { getString } from '@salesforce/ts-types';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create({
      project: {
        name: 'MyTestProject',
      },
      setupCommands: ['sfdx force:org:create edition=Developer'],
    });
  });

  it('using testkit to run commands with an org', () => {
    const username = getString(testSession.setup[0], 'result.username');
    execCmd(`force:source:deploy -x package.xml -u ${username}`, { ensureExitCode: 0 });
  });

  after(async () => {
    await testSession?.clean();
  });
});
```

## Testing with multiple test projects

**_Usecase: Some of my plugin command tests require multiple SFDX test projects._**

```typescript
import { execCmd, TestSession, TestProject } from '@salesforce/cli-plugins-testkit';
import { getString } from '@salesforce/ts-types';
import * as path from 'path';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create({
      project: {
        sourceDir: path.join(process.cwd(), 'localTestProj'),
      },
      setupCommands: ['sfdx force:org:create -f config/project-scratch-def.json'],
    });
  });

  it('using testkit to run sync commands', () => {
    execCmd('config:list', { ensureExitCode: 0 });
  });

  it('should create another project and set the cwd stub', () => {
    // Create another test project and reset the cwd stub
    const project2 = new TestProject({
      name: 'project2',
    });
    testSession.stubCwd(project2.dir);
    const username = getString(testSession.setup[0], 'result.username');
    execCmd(`force:source:pull -u ${username}`);
  });

  after(async () => {
    await testSession?.clean();
  });
});
```

## Testing with multiple scratch orgs

**_Usecase: Some of my plugin command tests require multiple scratch orgs._**

```typescript
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { getString } from '@salesforce/ts-types';
import * as shelljs from 'shelljs';

/*
   NOTE: Scratch orgs can take a while to create so you may want to create them in parallel
         in a global test fixture and refer to them in your tests.  There are lots of
         possibilities though and this example shows a few ways how you might create multiple
         scratch orgs in a test file.
*/

describe('Sample NUT 1', () => {
  let testSession: TestSession;
  const username = 'user@test.org';

  before(async () => {
    testSession = await TestSession.create({
      project: {
        name: 'TestProj1',
      },
      setupCommands: [
        // rely on defaultusername
        'sfdx force:org:create -f config/project-scratch-def.json -s',
        // explicitly set a username
        `sfdx force:org:create -f config/project-scratch-def.json username=${username}`,
      ],
    });
  });

  it('should create a 3rd org and get the username from the json output', () => {
    const firstOrg = getString(testSession.setup[0], 'result.username');
    execCmd(`force:source:retrieve -m ApexClass -u ${firstOrg}`, { ensureExitCode: 0 });
    execCmd(`force:source:retrieve -p force-app -u ${username}`, { ensureExitCode: 0 });
  });

  it('should create a 3rd org and get the username from the json output', () => {
    // Note that this org will not be deleted for you by TestSession.
    const rv = shelljs.exec('sfdx force:org:create -f config/project-scratch-def.json --json');
    const jsonOutput = JSON.parse(rv.stdout);
    const thirdOrg = jsonOutput.result.username;
    execCmd(`force:source:pull -u ${thirdOrg}`);
  });

  after(async () => {
    await testSession?.clean();
  });
});

// Create 2 scratch orgs in parallel.
describe('Sample NUT 2', () => {
  before(async () => {
    // NOTE: this is for demonstration purposes and doesn't work as is
    //       since shelljs does not return promises, but conveys the point.
    const org1 = shelljs.exec('sfdx force:org:create edition=Developer', { async: true });
    const org2 = shelljs.exec('sfdx force:org:create edition=Developer', { async: true });
    await Promise.all([org1, org2]);
  });
});
```

## Changing the process.cwd stub

**_Usecase: The TestSession stubs process.cwd() to my SFDX project for me, but I want to change it during testing._**

```typescript
import { execCmd, TestSession, TestProject } from '@salesforce/cli-plugins-testkit';

/*
   NOTE: you could also change the cwd for one command by overriding in execCmd options.
*/

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(async () => {
    testSession = await TestSession.create({
      project: {
        name: 'MyTestProject',
      },
    });
  });

  it('should execute a command from the default cwd', () => {
    execCmd('config:get defaultusername');
  });

  it('should execute a command from the new cwd stub', () => {
    // Change the stubbed process.cwd dir
    testSession.stubCwd(__dirname);
    execCmd('config:get defaultusername');
  });

  after(async () => {
    await testSession?.clean();
  });
});
```

---

# Configuring Testkit with Environment Variables

## Testkit Debug output

**_Usecase: I want to see all the stuff that the testkit is doing, either because I’m curious or need to troubleshoot._**

```bash
# To see all testkit debug output, in your shell
export DEBUG=testkit:*
# To see specific debug output (e.g., project setup), in your shell
export DEBUG=testkit:project
```

## Testing with existing devhub authentication

**_Usecase: I have a plugin with commands that require devhub authentication before running, and I want to use my current devhub auth config._**

```bash
export TESTKIT_HUB_USERNAME=test1@scratch.org
```

## Testing with SFDX Auth URL

**_Usecase: I have a plugin with commands that require devhub authentication before running, and I want to use a SFDX auth URL._**

```bash
export TESTKIT_AUTH_URL=test1@scratch.org
```

## Testing with JWT devhub authentication

**_Usecase: I have a plugin with commands that require devhub authentication before running, and I want to use a JWT devhub auth config._**

```bash
# Ensure caution with the JWT key file contents! E.g., Set within protected Circle CI env vars.
export TESTKIT_HUB_USERNAME=test1@scratch.org
export TESTKIT_JWT_CLIENT_ID=<clientID>
export TESTKIT_JWT_KEY=<contents of the jwt key file>
```

## Reusing orgs during test runs

**_Usecase: I want the tests to use a specific scratch org or reuse one from a previous test run. Tests should not create scratch orgs._**

```bash
export TESTKIT_ORG_USERNAME=test1@scratch.org
```

## Reusing projects during test runs

**_Usecase: I want the tests to use a specific SFDX project directory and not copy one into a TestSession dir. Or I kept the test artifacts from a previous run and want to reuse them._**

```bash
export TESTKIT_PROJECT_DIR=/Users/me/projects/MyTestProject
```

## Using my actual homedir during test runs

**_Usecase: I want to have the tests use my actual home directory, not a temporary stubbed home dir._**

```bash
export TESTKIT_HOMEDIR=/Users/me
```

## Saving test artifacts after test runs

**_Usecase: I want to keep the test project, scratch org, and test session dir after the tests are done running to troubleshoot._**

```bash
export TESTKIT_SAVE_ARTIFACTS=true
```

---

# Testkit Best Practices

1. Clean the TestSession in a code block that always runs (e.g., mocha’s after() ) to keep your plugin clean. You can always choose to zip a project or test session after tests run or on each test failure.
1. Point your CI jobs to different CLI executables using the TESTKIT_EXECUTABLE_PATH env var to ensure your plugin works with the various ways the CLI can be installed. By default it will use your plugin’s `./bin/run` but you can define a local or global npm install path or install from public archives.
1. Use a naming pattern for test files that use the testkit. These are not unit tests so we like to refer to them as “NUTs” and have a convention of `*.nut.ts` so we can run them separately from unit tests.
1. Use `SFDX_USE_GENERIC_UNIX_KEYCHAIN=true` to prevent authentication keychain issues.
1. When writing TypeScript NUTs remember to pass the expected type to execCmd so JSON results are typed for you.
1. Take advantage of TestSession's automatic authentication using the appropriate environment variables.
