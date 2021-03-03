**NOTE:** _This is currently a static doc but will soon be generated with compiled example code so that the doc is always up to date._

# Using Testkit’s execCmd function

The execCmd function allows plugin commands to execute with a specific CLI executable, defaulting to the plugin’s ./bin/run . It can automatically ensure a specific exit code and throw an error when that exit code is not returned. Commands can be executed synchronously or asynchronously. All command results exitCode, stdout, and stderr are returned. If the --json flag was provided the results will have the parsed JSON output. Command execution time is provided as a Duration object for easy manipulation.

## Testing plugin commands synchronously

**_Usecase: I have a plugin with commands that I want to run within tests synchronously using my plugin’s ./bin/run_**

```typescript
import { execCmd } from '@salesforce/cli-plugins-testkit';

describe('Sample NUT', () => {
  it('using testkit to run sync commands', () => {
    const rv = execCmd('config:list');
    expect(rv.stdout).to.contain('successfully did something');
  });
});
```

## Testing plugin commands asynchronously

**_Usecase: I have a plugin with commands that I want to run within tests asynchronously._**

```typescript
import { execCmd } from '@salesforce/cli-plugins-testkit';

describe('Sample NUT', () => {
  it('using testkit to run async commands', async () => {
    await execCmd('config:list', { async: true });
  });
});
```

## Testing plugin commands exit code

**_Usecase: I have a plugin with commands that I want to run and throw an error if a certain exit code is not returned automatically._**

```typescript
import { execCmd } from '@salesforce/cli-plugins-testkit';

describe('Sample NUT', () => {
  it('using testkit to ensure exit code 0', () => {
    execCmd('config:list', { ensureExitCode: 0 });
  });
});
```

## Testing plugin commands with a specific SFDX binary

**_Usecase: I have a plugin with commands that I want to run with a specific SFDX binary rather than my plugin’s ./bin/run._**

```typescript
import { execCmd } from '@salesforce/cli-plugins-testkit';

describe('Sample NUT', () => {
  // This could be set in a CI environment instead or point to
  // a specific location on the file system.
  process.env.TESTKIT_EXECUTABLE_PATH = 'sfdx';
  it('using testkit to ensure exit code 0', () => {
    execCmd('config:list');
  });
});
```

## Testing plugin commands JSON output

**_Usecase: I have a plugin with commands that I want to run and have parsed JSON output returned for easy verification._**

```typescript
import { execCmd } from '@salesforce/cli-plugins-testkit';

describe('Sample NUT', () => {
  it('using testkit to ensure exit code 0', () => {
    // Simply have your command use the --json flag
    const rv = execCmd('config:list --json');
    expect(rv.jsonOutput.result).deep.equals([
      {
        key: 'defaultdevhubusername',
        location: 'Global',
        value: 'myDevHub',
      },
    ]);
  });
});
```

## Specifying return types

**_Usecase: I have a plugin with commands that I want to run and have typed JSON output._**

```typescript
import { execCmd } from '@salesforce/cli-plugins-testkit';

describe('Sample NUT', () => {
  it('using testkit with typescript types', () => {
    const rv = execCmd<SomeType>('config:list --json');
    // rv is of type JsonResult with property "result" of type "SomeType"
  });
});
```

## Getting command execution times

**_Usecase: I want to ensure my plugin commands execute within an acceptable duration range._**

```typescript
import { execCmd } from '@salesforce/cli-plugins-testkit';

describe('Sample NUT', () => {
  it('config:list should execute in less than 5 seconds', () => {
    const t1 = execCmd(`config:list`).execCmdDuration.asMillis();
    const t2 = execCmd(`config:list`).execCmdDuration.asMillis();
    const t3 = execCmd(`config:list`).execCmdDuration.asMillis();
    const aveExecTime = (t1 + t2 + t3) / 3;
    expect(aveExecTime).to.be.lessThan(5000);
  });
});
```

# Using Testkit’s TestSession class

A TestSession provides conveniences to testing plugin commands with options to authenticate to a devhub, create scratch orgs, define SFDX test projects, stub the current working directory of a process, run a list of setup commands, archive the contents of a test session, and use a unique identifier.

## Testing with generated sfdx project

**_Usecase: I have a plugin with commands that require a SFDX project but the tests don’t care about the contents of the project._**

```typescript
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(() => {
    testSession = TestSession.create({
      project: {
        name: 'MyTestProject',
      },
    });
  });

  it('using testkit to run sync commands', () => {
    execCmd('config:list', { ensureExitCode: 0 });
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

  before(() => {
    testSession = TestSession.create({
      project: {
        sourceDir: path.join(process.cwd(), 'localTestProj'),
      },
    });
  });

  it('using testkit to run sync commands', () => {
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

  before(() => {
    testSession = TestSession.create({
      project: {
        gitClone: 'https://github.com/trailheadapps/ebikes-lwc.git',
      },
    });
  });

  it('using testkit to run sync commands', () => {
    execCmd('config:list', { ensureExitCode: 0 });
  });

  after(async () => {
    await testSession?.clean();
  });
});
```

## Testing with no sfdx project

**_Usecase: I have a plugin with commands that do not require a SFDX project but I want other things from a TestSession such as easy authentication to a devhub, access to a unique ID, homedir stub, etc._**

```typescript
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(() => {
    testSession = TestSession.create();
  });

  it('using testkit to run sync commands', () => {
    execCmd(`config:set instanceUrl=${testSession.id}`, { ensureExitCode: 0 });
  });

  after(async () => {
    await testSession?.clean();
  });
});
```

## Override the location of a TestSession

**_Usecase: I want my tests to control the location of my TestSession._**

```typescript
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { tmpdir } from 'os';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(() => {
    testSession = TestSession.create({
      // NOTE: you can also override with an env var.
      //       See section on Testkit env vars.
      sessionDir: tmpdir(),
    });
  });

  it('using testkit to run sync commands', () => {
    execCmd(`config:set instanceUrl=${testSession.id}`);
  });

  after(async () => {
    await testSession?.clean();
  });
});
```

## Cleaning TestSessions

**_Usecase: I want to use TestSessions but clean everything when the tests are done running._**

```typescript
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(() => {
    testSession = TestSession.create();
  });

  it('using testkit to run sync commands', () => {
    execCmd(`config:set instanceUrl=${testSession.id}`, { ensureExitCode: 0 });
  });

  // Do this in your tests to keep your plugin clean.
  after(async () => {
    await testSession?.clean();
  });
});
```

## Archiving TestSessions

**_Usecase: I want to use TestSessions but zip the test session directory when the tests are done running._**

**_NOTE: Must set env var: `TESTKIT_ENABLE_ZIP=true`_**

```typescript
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(() => {
    testSession = TestSession.create();
  });

  it('using testkit to run sync commands', () => {
    execCmd(`config:set instanceUrl=${testSession.id}`, { ensureExitCode: 0 });
  });

  after(async () => {
    await testSession?.zip();
    await testSession?.clean();
  });
});
```

## Archiving TestSessions on test failure

**_Usecase: I want to use TestSessions but zip the test session directory when the tests fail._**

**_NOTE: Must set env var: `TESTKIT_ENABLE_ZIP=true`_**

```typescript
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(() => {
    testSession = TestSession.create();
  });

  it('using testkit to run sync commands', () => {
    execCmd(`config:set instanceUrl=${testSession.id}`, { ensureExitCode: 0 });
  });

  afterEach(function () {
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
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { env } from '@salesforce/kit';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(() => {
    const cid = env.getString('TESTKIT_CLIENT_ID');
    const jwtFile = env.getString('TESTKIT_JWT_FILE');
    const devhub = env.getString('TESTKIT_DEVHUB');

    testSession = TestSession.create({
      project: {
        name: 'MyTestProject',
      },
      setupCommands: [
        `sfdx auth:jwt:grant -i ${cid} -f ${jwtFile} -u ${devhub} -d`,
        'sfdx force:org:create edition=Developer',
      ],
    });
  });

  it('using testkit to run commands with an org', () => {
    const devhubUsername = testSession.setup[0].result.username;
    const username = testSession.setup[1].result.username;
    execCmd(`user:create -v ${devhubUsername} -u ${username}`);
  });

  after(async () => {
    await testSession?.clean();
  });
});
```

## Testing with scratch orgs

**_Usecase: I have a plugin with commands that require an org._**

```typescript
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import { env } from '@salesforce/kit';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(() => {
    const cid = env.getString('TESTKIT_CLIENT_ID');
    const jwtFile = env.getString('TESTKIT_JWT_FILE');
    const devhub = env.getString('TESTKIT_DEVHUB');

    testSession = TestSession.create({
      project: {
        name: 'MyTestProject',
      },
      setupCommands: [
        `sfdx auth:jwt:grant -i ${cid} -f ${jwtFile} -u ${devhub} -d -a devhub`,
        'sfdx force:org:create -f config/project-scratch-def.json',
      ],
    });
  });

  it('using testkit to run commands with an org', () => {
    const username = testSession.setup[1].result.username;
    execCmd(`user:create -u ${username}`);
  });

  after(async () => {
    await testSession?.clean();
  });
});
```

## Testkit Debug output

**_Usecase: I want to see all the stuff that the testkit is doing, either because I’m curious or need to troubleshoot._**

```bash
# To see all testkit debug output, in your shell
export DEBUG=testkit:*
# To see specific debug output (e.g., project setup), in your shell
export DEBUG=testkit:project
```

## Testing with multiple test projects

**_Usecase: Some of my plugin command tests require multiple SFDX test projects. How do I do that?_**

```typescript
import { execCmd, TestSession, TestProject } from '@salesforce/cli-plugins-testkit';
import * as path from 'path';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(() => {
    testSession = TestSession.create({
      project: {
        sourceDir: path.join(process.cwd(), 'localTestProj'),
      },
      setupCommands: ['sfdx force:org:create -f config/project-scratch-def.json'],
    });
  });

  it('using testkit to run sync commands', () => {
    execCmd('config:list', { ensureExitCode: 0 });
  });

  it('using testkit to run sync commands', () => {
    // Create another test project and reset the cwd stub
    const project2 = new TestProject({
      name: 'project2',
    });
    testSession.stubCwd(project2.dir);
    execCmd(`force:source:pull -u ${testSession.orgUsername}`);
  });

  after(async () => {
    await testSession?.clean();
  });
});
```

## Testing with multiple scratch orgs

**_Usecase: Some of my plugin command tests require multiple scratch orgs. How do I do that?_**

**_NOTE: Scratch orgs can take a while to create so you may want to create them in parallel in a global test fixture and refer to them in your tests. There are lots of possibilities though and this example shows a few ways how you might create multiple scratch orgs in a test file._**

```typescript
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';
import * as shelljs from 'shelljs';

describe('Sample NUT 1', () => {

  let testSession: TestSession;

  before(() => {
    testSession = TestSession.create({
      project: {
        name: 'TestProj1')
      },
      setupCommands: [
        // assumes devhub auth is setup already
        'sfdx force:org:create -f config/project-scratch-def.json'
      ]
    });
  });

  it('using testkit to run sync commands', () => {
    execCmd('config:list', { ensureExitCode: 0 });
  });

  it('create a 2nd org and get the username from the json output', () => {
    // Note that this org will not be deleted for you by TestSession.
    const rv = execCmd(`org:create -f config/project-scratch-def.json --json`);
    const org2 = rv.jsonOutput.result.username;
    execCmd(`force:source:pull -u ${org2}`);
  });

  it('create a 3rd org using a username override', () => {
    const username = `${testSession.id}@scratch.org`;
    execCmd(`org:create -f config/project-scratch-def.json username=${username}`);
    execCmd(`force:source:pull -u ${username}`);
  });

  it('create a 4th org and rely on defaultusername', () => {
    execCmd(`org:create -f config/project-scratch-def.json -s`);
    execCmd(`force:source:pull`);
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
    await Promise.all(org1, org2);
  });
});
```

## Changing the process.cwd stub

**_Usecase: The TestSession stubs process.cwd() to my SFDX project for me, but what if I want to change it during tests?_**

**_NOTE: you could also change the cwd for one command by overriding in execCmd options._**

```typescript
import { execCmd, TestSession } from '@salesforce/cli-plugins-testkit';

describe('Sample NUT', () => {
  let testSession: TestSession;

  before(() => {
    testSession = TestSession.create();
  });

  it('using testkit to run sync commands', () => {
    execCmd('config:get defaultusername');
  });

  it('test a command after changing the process.cwd stub', () => {
    // Change the stubbed process.cwd dir
    testSession.stubCwd(__dirname);
    execCmd('config:get defaultusername');
  });

  after(async () => {
    await testSession?.clean();
  });
});
```

## Creating a TestSession with authed devhub (TBD)

# Testkit Environment Variables

```shell
TESTKIT_EXECUTABLE_PATH
TESTKIT_SESSION_DIR
TESTKIT_HOMEDIR
TESTKIT_ORG_USERNAME
TESTKIT_PROJECT_DIR
TESTKIT_SAVE_ARTIFACTS
TESTKIT_ENABLE_ZIP
TESTKIT_HUB_USERNAME
TESTKIT_HUB_INSTANCE
TESTKIT_JWT_CLIENT_ID
TESTKIT_JWT_KEY
TESTKIT_AUTH_URL
```

## Reusing orgs during test runs

**_Usecase: I want the tests to use a specific scratch org or reuse one from a previous test run._**

```bash
export TESTKIT_ORG_USERNAME="test1@scratch.org"
```

## Reusing projects during test runs

**_Usecase: I want the tests to use a specific SFDX project directory and not copy one into a TestSession dir. Or I kept the test artifacts from a previous run and want to reuse them._**

```bash
export TESTKIT_PROJECT_DIR="/Users/me/projects/MyTestProject"
```

## Using my actual homedir during test runs

**_Usecase: I want to have the tests use my actual home directory._**

```bash
export TESTKIT_HOMEDIR="/Users/me"
```

## Keeping test artifacts (orgs, projects, test sessions) after test runs

**_Usecase: I want to keep the test project, scratch org, and test session dir after the tests are done running to troubleshoot._**

```bash
export TESTKIT_SAVE_ARTIFACTS=true
```

# Testkit Recommendations

1. Clean the TestSession in a code block that always runs (e.g., mocha’s after() ) to keep your plugin clean. You can always choose to zip a project or test session after tests run or on each test failure.
1. Point your CI jobs to different CLI executables using the TESTKIT_EXECUTABLE_PATH env var to ensure your plugin works with the various ways the CLI can be installed. By default it will use your plugin’s ./bin/run but you can define a local or global npm install path or install from public archives.
1. Use a naming pattern for test files that use the testkit. These are not unit tests so we like to refer to them as “NUTs” and have a convention of \*.nut.ts so we can run them separately from unit tests.
1. Use SFDX_USE_GENERIC_UNIX_KEYCHAIN=true to prevent keychain issues.
