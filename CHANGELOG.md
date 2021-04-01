# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.0.17](https://github.com/salesforcecli/cli-plugins-testkit/compare/v0.0.16...v0.0.17) (2021-04-01)

### [0.0.16](https://github.com/salesforcecli/cli-plugins-testkit/compare/v0.0.15...v0.0.16) (2021-03-31)


### Features

* generate a SAMPLES.md doc ([041f172](https://github.com/salesforcecli/cli-plugins-testkit/commit/041f1724df091bacfb7a4a6a42d79641ed59301b))


### Bug Fixes

* throw if sfdx is not found ([d6c2632](https://github.com/salesforcecli/cli-plugins-testkit/commit/d6c26326857706d8ca8d88445aa544519923a380))
* throw when sfdx not found to run setup commands ([a38ee45](https://github.com/salesforcecli/cli-plugins-testkit/commit/a38ee45364d975f0ea89cf94836b12f0628bdace))

### [0.0.15](https://github.com/salesforcecli/cli-plugins-testkit/compare/v0.0.14...v0.0.15) (2021-03-18)


### Features

* add retry logic to setupCommands ([8cffaf2](https://github.com/salesforcecli/cli-plugins-testkit/commit/8cffaf22f3bf4e3eaae717740d0cd5bf85079eef))
* use AsyncCreatable ([76c8f22](https://github.com/salesforcecli/cli-plugins-testkit/commit/76c8f221dd8d46298d770aa7ce98b6eb9d526f7c))


### Bug Fixes

* delete existing orgs when before retrying setupCommands ([89db509](https://github.com/salesforcecli/cli-plugins-testkit/commit/89db509590eb3a7ee8e9fb15217433f01fa79465))

### [0.0.14](https://github.com/salesforcecli/cli-plugins-testkit/compare/v0.0.13...v0.0.14) (2021-03-04)


### Features

* add type parameter to execCmd ([#34](https://github.com/salesforcecli/cli-plugins-testkit/issues/34)) ([14639f7](https://github.com/salesforcecli/cli-plugins-testkit/commit/14639f76d9bba2f15c99f6b80d6e912bfcc176a8))


### Bug Fixes

* add strip-ansi ([1684979](https://github.com/salesforcecli/cli-plugins-testkit/commit/16849790c12a20d48b4250084b2988fac401f87e))

### [0.0.13](https://github.com/salesforcecli/cli-plugins-testkit/compare/v0.0.12...v0.0.13) (2021-02-26)


### Features

* add type parameter to execCmd ([#34](https://github.com/salesforcecli/cli-plugins-testkit/issues/34)) ([7ce118a](https://github.com/salesforcecli/cli-plugins-testkit/commit/7ce118abe02e9128a04f9a80767a32b909ace96c))

### [0.0.12](https://github.com/salesforcecli/cli-plugins-testkit/compare/v0.0.11...v0.0.12) (2021-02-25)


### Features

* specify auth strategy ([7f07f22](https://github.com/salesforcecli/cli-plugins-testkit/commit/7f07f228ba3c4f957a5cbf81e22ffc43189a6413))

### [0.0.11](https://github.com/salesforcecli/cli-plugins-testkit/compare/v0.0.10...v0.0.11) (2021-02-25)


### Bug Fixes

* windows homedir ([aafc2d2](https://github.com/salesforcecli/cli-plugins-testkit/commit/aafc2d2eea6d8168968916089fe10afc9dcfab73))

### [0.0.10](https://github.com/salesforcecli/cli-plugins-testkit/compare/v0.0.8...v0.0.10) (2021-02-21)


### Bug Fixes

* move sinon to dependencies from devDependencies ([b13189d](https://github.com/salesforcecli/cli-plugins-testkit/commit/b13189d9fb0054bdc5732b75e74928dac39227be))

### [0.0.8](https://github.com/salesforcecli/cli-plugins-testkit/compare/v0.0.7...v0.0.8) (2021-02-18)

### [0.0.7](https://github.com/salesforcecli/cli-plugins-testkit/compare/v0.0.6...v0.0.7) (2021-02-18)

### [0.0.6](https://github.com/salesforcecli/cli-plugins-testkit/compare/v0.0.5...v0.0.6) (2021-02-18)

### Bug Fixes

- properly format jwtkey prior to file save ([c6045d3](https://github.com/salesforcecli/cli-plugins-testkit/commit/c6045d301ba97511e50d9fbd470e2ec74fed614a))

### [0.0.5](https://github.com/salesforcecli/cli-plugins-testkit/compare/v0.0.4...v0.0.5) (2021-02-18)

### Features

- untested hubauth ([c50e679](https://github.com/salesforcecli/cli-plugins-testkit/commit/c50e6799d81edb85a9384cff97b230be767808e6))
- working autoAuth ([f0dc0d2](https://github.com/salesforcecli/cli-plugins-testkit/commit/f0dc0d2c7fc5d4278a3c81807797a2245b7ba26f))

### Bug Fixes

- remove authurl from logger ([1aa02f6](https://github.com/salesforcecli/cli-plugins-testkit/commit/1aa02f6c01682c5d16a5736a12bd06d66af5dc3c))
- silent execs ([54a7aa9](https://github.com/salesforcecli/cli-plugins-testkit/commit/54a7aa9cb21fd1a803c8dc15dafd8d3b837c23da))

### [0.0.4](https://github.com/salesforcecli/cli-plugins-testkit/compare/v0.0.3...v0.0.4) (2021-02-16)

### Features

- add TestProject, zipDir, and session updates ([4b013ad](https://github.com/salesforcecli/cli-plugins-testkit/commit/4b013adc38e47a0d506fd1a603ebdeeb729ac212))
- adds a test session and test project class for NUTs ([c17a39d](https://github.com/salesforcecli/cli-plugins-testkit/commit/c17a39d9c0f64701bc2265830864775abcef0ec0))
- changes based on code reviews and meetings ([550ce79](https://github.com/salesforcecli/cli-plugins-testkit/commit/550ce7973ef737231406b467f8ad1dad9294a0db))
- finishing touches on test session deletion and project creation ([2920d3f](https://github.com/salesforcecli/cli-plugins-testkit/commit/2920d3f2b73a0f41d38cdd1ee05e2e4765eb4e28))

### [0.0.3](https://github.com/salesforcecli/cli-plugins-testkit/compare/v0.0.2...v0.0.3) (2021-02-03)

### [0.0.2](https://github.com/salesforcecli/cli-plugins-testkit/compare/v0.0.1...v0.0.2) (2021-01-28)

### 0.0.1 (2021-01-28)

# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.
