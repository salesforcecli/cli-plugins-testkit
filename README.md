[![NPM](https://img.shields.io/npm/v/@salesforce/cli-plugins-testkit.svg)](https://www.npmjs.com/package/@salesforce/cli-plugins-testkit)
[![CircleCI](https://circleci.com/gh/salesforcecli/cli-plugins-testkit.svg?style=svg&circle-token=2377ca31221869e9d13448313620486da80e595f)](https://circleci.com/gh/salesforcecli/cli-plugins-testkit)
[![codecov](https://codecov.io/gh/salesforcecli/cli-plugins-testkit/branch/main/graph/badge.svg)](https://codecov.io/gh/salesforcecli/cli-plugins-testkit)

# Description

**This package is in heavy development. The APIs exposed from this pacakge are incomplete and will change frequently.**

The @salesforce/cli-plugins-testkit library provides test utilities to assist Salesforce CLI plug-in authors with writing NUTs (non-unit-tests), like integration, smoke, and e2e style testing. For example, you could write tests to ensure your plugin commands execute properly using an isolated Salesforce project, scratch org, and different Salesforce CLI executables.

# Usage

Add this library as a dev dependencies to your project.

```bash
yarn add @salesforcecli/cli-plugins-testkit --dev
```

Create a test file and import the utilties from this library that you'd like to use.

Using a different file exention will help seperate your unit tests from your NUTs even if they are in the same directories. For example, if you use `mytest.nut.ts` instead of `mytest.test.ts`, you can have the following scripts in your package.json (assuming mocha).

```json
{
  "scripts": {
    "test": "mocha **/*.test.ts",
    "test-nut": "mocha **/*.nut.ts"
  }
}
```

## Running Commands

Running oclif commands locally is as simple as running against the local `bin/run` file.

```typescript
import { exec } from 'shelljs';
const result = exec('./bin/run mycommand --myflag --json');
console.log(JSON.parse(result.stdout));
```

However, that doesn't provide flexiblity to target different CLI executables in Continous Integration (CI). For example, you may want to run NUTs against the newly published version of your plugin against the latest-rc of the Salesforce CLI to make sure everything still works as expected.

The testkit provides `execCmd` which makes the executable configurable as well as builtin json parsing.

```typescript
import { execCmd } from '@salesforce/cli-plugins-testkit';

const result = execCmd('mycommand --myflag --json');
console.log(result.jsonOutput);
```

The executable can then be configured in CI using the `TESTKIT_EXECUTABLE_PATH`.

```bash
# Install the release candidate in the current directory using NPM
npm install sfdx@latest-rc

# Install the newly published version of my plugin
./node_modules/.bin/sfdx plugins:install myplugin

# Target the local sfdx
export TESTKIT_EXECUTABLE_PATH=./node_modules/.bin/sfdx

# Run NUT test (requires a test-nut script target in the package.json)
yarn test-nut
```

You will notice that the executable is not configurable in the `execCmd` method directly. If you need to run other commands not located in your plugin, use shelljs directly.

```typescript
import { exec } from 'shelljs';
import { execCmd } from '@salesforce/cli-plugins-testkit';

await exec('sfdx auth:jwt:grant ... --json');
const result = await execCmd('mycommand --myflag --json');
```

## Contributing

TBD
