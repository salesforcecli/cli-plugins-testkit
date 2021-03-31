[![NPM](https://img.shields.io/npm/v/@salesforce/cli-plugins-testkit.svg)](https://www.npmjs.com/package/@salesforce/cli-plugins-testkit)
[![CircleCI](https://circleci.com/gh/salesforcecli/cli-plugins-testkit.svg?style=svg&circle-token=2377ca31221869e9d13448313620486da80e595f)](https://circleci.com/gh/salesforcecli/cli-plugins-testkit)
[![codecov](https://codecov.io/gh/salesforcecli/cli-plugins-testkit/branch/main/graph/badge.svg)](https://codecov.io/gh/salesforcecli/cli-plugins-testkit)

# Description

The @salesforce/cli-plugins-testkit library provides test utilities to assist Salesforce CLI plug-in authors with writing NUTs (non-unit-tests), like integration, smoke, and e2e style testing. For example, you could write tests to ensure your plugin commands execute properly using an isolated Salesforce project, scratch org, and different Salesforce CLI executables.

# Usage

Add this library as a dev dependencies to your project.

```bash
yarn add @salesforcecli/cli-plugins-testkit --dev
```

Create a test file and import the utilities from this library that you'd like to use.

Using a different file extension will help separate your unit tests from your NUTs even if they are in the same directories. For example, if you use `mytest.nut.ts` instead of `mytest.test.ts`, you can have the following scripts in your package.json (assuming mocha).

```json
{
  "scripts": {
    "test": "mocha **/*.test.ts",
    "test-nut": "mocha **/*.nut.ts"
  }
}
```

**See [Samples](./SAMPLES.md) doc for many testkit usecases and sample code**

# Example NUTs

Here are some public github repos for plugins that use this library for NUTs:
[@salesforce/plugin-alias NUT](https://github.com/salesforcecli/plugin-alias/blob/main/test/commands/alias/set.nut.ts)
[@salesforce/plugin-auth NUT](https://github.com/salesforcecli/plugin-auth/blob/main/test/commands/auth/list.nut.ts)
[@salesforce/plugin-config NUT](https://github.com/salesforcecli/plugin-config/blob/main/test/commands/config/list.nut.ts)
[@salesforce/plugin-data NUT](https://github.com/salesforcecli/data/blob/main/packages/plugin-data/test/commands/force/data/tree/dataTree.nut.ts)
[@salesforce/plugin-org NUT](https://github.com/salesforcecli/plugin-org/blob/main/test/nut/commands/force/org/org.nut.ts)
[@salesforce/plugin-user NUT](https://github.com/salesforcecli/plugin-user/blob/main/test/allCommands.nut.ts)

## Running Commands

Although oclif provides a way to run commands locally using the local `bin/run` file...

```typescript
import { exec } from 'shelljs';
const result = exec('./bin/run mycommand --myflag --json');
console.log(JSON.parse(result.stdout));
```

...that doesn't provide flexibility to target different CLI executables in Continuous Integration (CI). For example, you may want to run NUTs against the newly published version of your plugin using the latest-rc of the Salesforce CLI to make sure everything still works as expected.

The testkit provides `execCmd` which uses the `TESTKIT_EXECUTABLE_PATH` environment variable to run a plugin command, in addition to other useful builtin utilties such as json parsing, return type casting (for TypeScript) and command execution timing.

```typescript
import { execCmd } from '@salesforce/cli-plugins-testkit';

const result = execCmd<MyReturntype>('mycommand --myflag --json').jsonOutput;
expect(result.name).to.equal('expectedName');
```

```bash
# Install the release candidate in the current directory using NPM
npm install sfdx@latest-rc

# Install the newly published version of my plugin
./node_modules/.bin/sfdx plugins:install myplugin

# Target the local sfdx
export TESTKIT_EXECUTABLE_PATH=./node_modules/.bin/sfdx

# Run NUTs (requires a test:nuts script target in the package.json)
yarn test:nuts
```

You will notice that the executable is not configurable in the `execCmd` method directly. If you need to run other commands not located in your plugin, use shelljs directly.

```typescript
import { exec } from 'shelljs';
import { execCmd } from '@salesforce/cli-plugins-testkit';

await exec('sfdx auth:jwt:grant ... --json');
const result = await execCmd('mycommand --myflag --json');
```

# Environment Variables

| Env Var                       | Description                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| TESTKIT_SESSION_DIR           | Overrides the default directory for the test session.                                                           |
| TESTKIT_HOMEDIR               | Path to a home directory that the tests will use as a stub of os.homedir.                                       |
| TESTKIT_ORG_USERNAME          | An org username to use for test commands. Tests will use this org rather than creating new orgs.                |
| TESTKIT_PROJECT_DIR           | A SFDX project to use for testing. The tests will use this project directly rather than creating a new project. |
| TESTKIT_SAVE_ARTIFACTS        | Prevents a test session from deleting orgs, projects, and test sessions during TestSession.clean().             |
| TESTKIT_ENABLE_ZIP            | Allows zipping the session dir when this is true and `TestSession.zip()` is called during a test.               |
| TESTKIT_SETUP_RETRIES         | Number of times to retry the setupCommands after the initial attempt before throwing an error.                  |
| TESTKIT_SETUP_RETRIES_TIMEOUT | Milliseconds to wait before the next retry of setupCommands. Defaults to 5000.                                  |
| TESTKIT_HUB_USERNAME          | Username of an existing, authenticated devhub org that TestSession will use to auto-authenticate for tests.     |
| TESTKIT_JWT_CLIENT_ID         | clientId of the connected app that TestSession will use to auto-authenticate for tests.                         |
| TESTKIT_JWT_KEY               | JWT key file **contents** that TestSession will use to auto-authenticate for tests.                             |
| TESTKIT_HUB_INSTANCE          | Instance url for the devhub org. Defaults to https://login.salesforce.com                                       |
| TESTKIT_AUTH_URL              | Auth url that TestSession will use to auto-authenticate for tests. Uses the `auth:sfdxurl:store` command.       |

# Contributing
