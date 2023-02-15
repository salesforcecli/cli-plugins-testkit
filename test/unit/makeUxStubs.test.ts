/*
 * Copyright (c) 2023, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { SfCommand, Ux } from '@salesforce/sf-plugins-core';
import { createSandbox, SinonSandbox } from 'sinon';
import { ux as coreUx, Flags, Interfaces } from '@oclif/core';
import { expect } from 'chai';
import { makeUxStubs } from '../../src/index';

const TABLE_DATA = Array.from({ length: 10 }).fill({ id: '123', name: 'foo', value: 'bar' }) as Array<
  Record<string, unknown>
>;
const TABLE_COLUMNS = {
  id: { header: 'ID' },
  name: {},
  value: { header: 'TEST' },
};

class Cmd extends SfCommand<void> {
  public static flags = {
    method: Flags.custom<'@oclif/core' | 'SfCommand' | 'Ux'>({
      options: ['@oclif/core', 'SfCommand', 'Ux'],
    })({
      required: true,
    }),
    info: Flags.boolean(),
    log: Flags.boolean(),
    logSensitive: Flags.boolean(),
    logSuccess: Flags.boolean(),
    logToStderr: Flags.boolean(),
    spinner: Flags.boolean(),
    styledHeader: Flags.boolean(),
    styledJSON: Flags.boolean(),
    styledObject: Flags.boolean(),
    table: Flags.boolean(),
    url: Flags.boolean(),
    warn: Flags.boolean(),
  };

  private flags!: Interfaces.InferredFlags<typeof Cmd.flags>;

  public async run(): Promise<void> {
    const { flags } = await this.parse(Cmd);
    this.flags = flags;

    if (flags.info) this.runInfo();
    if (flags.log) this.runLog();
    if (flags.logSensitive) this.runLogSensitive();
    if (flags.logSuccess) this.runLogSuccess();
    if (flags.logToStderr) this.runLogToStderr();
    if (flags.spinner) this.runSpinner();
    if (flags.styledHeader) this.runStyledHeader();
    if (flags.styledJSON) this.runStyledJSON();
    if (flags.styledObject) this.runStyledObject();
    if (flags.table) this.runTable();
    if (flags.url) this.runUrl();
    if (flags.warn) this.runWarn();
  }

  private runInfo(): void {
    switch (this.flags.method) {
      case '@oclif/core':
        coreUx.info('hello');
        break;
      case 'SfCommand':
        this.info('hello');
        break;
      case 'Ux':
        throw new Error('Ux.info is not implemented');
      default:
        throw new Error(`Invalid method: ${this.flags.method}`);
    }
    this.info('hello');
  }

  private runLog(): void {
    switch (this.flags.method) {
      case '@oclif/core':
        coreUx.log('hello');
        break;
      case 'SfCommand':
        this.log('hello');
        break;
      case 'Ux':
        new Ux().log('hello');
        break;
      default:
        throw new Error(`Invalid method: ${this.flags.method}`);
    }
  }

  private runLogSuccess(): void {
    switch (this.flags.method) {
      case '@oclif/core':
        throw new Error('ux.logSuccess is not implemented');
      case 'SfCommand':
        this.logSuccess('hello');
        break;
      case 'Ux':
        throw new Error('Ux.logSuccess is not implemented');
      default:
        throw new Error(`Invalid method: ${this.flags.method}`);
    }
  }

  private runLogSensitive(): void {
    switch (this.flags.method) {
      case '@oclif/core':
        throw new Error('ux.logSensitive is not implemented');
      case 'SfCommand':
        this.logSensitive('hello');
        break;
      case 'Ux':
        throw new Error('Ux.logSensitive is not implemented');
      default:
        throw new Error(`Invalid method: ${this.flags.method}`);
    }
  }

  private runLogToStderr(): void {
    switch (this.flags.method) {
      case '@oclif/core':
        throw new Error('ux.logToStderr is not implemented');
      case 'SfCommand':
        this.logToStderr('hello');
        break;
      case 'Ux':
        throw new Error('Ux.logToStderr is not implemented');
      default:
        throw new Error(`Invalid method: ${this.flags.method}`);
    }
  }

  private runWarn(): void {
    switch (this.flags.method) {
      case '@oclif/core':
        coreUx.warn('hello');
        break;
      case 'SfCommand':
        this.warn('hello');
        break;
      case 'Ux':
        new Ux().warn('hello');
        break;
      default:
        throw new Error(`Invalid method: ${this.flags.method}`);
    }
  }

  private runTable(): void {
    switch (this.flags.method) {
      case '@oclif/core':
        coreUx.table(TABLE_DATA, TABLE_COLUMNS);
        break;
      case 'SfCommand':
        this.table(TABLE_DATA, TABLE_COLUMNS);
        break;
      case 'Ux':
        new Ux().table(TABLE_DATA, TABLE_COLUMNS);
        break;
      default:
        throw new Error(`Invalid method: ${this.flags.method}`);
    }
  }

  private runUrl(): void {
    switch (this.flags.method) {
      case '@oclif/core':
        coreUx.url('oclif', 'https://oclif.io');
        break;
      case 'SfCommand':
        this.url('oclif', 'https://oclif.io');
        break;
      case 'Ux':
        new Ux().url('oclif', 'https://oclif.io');
        break;
      default:
        throw new Error(`Invalid method: ${this.flags.method}`);
    }
  }

  private runStyledHeader(): void {
    switch (this.flags.method) {
      case '@oclif/core':
        coreUx.styledHeader('hello');
        break;
      case 'SfCommand':
        this.styledHeader('hello');
        break;
      case 'Ux':
        new Ux().styledHeader('hello');
        break;
      default:
        throw new Error(`Invalid method: ${this.flags.method}`);
    }
  }

  private runStyledObject(): void {
    switch (this.flags.method) {
      case '@oclif/core':
        coreUx.styledObject({ foo: 'bar' });
        break;
      case 'SfCommand':
        this.styledObject({ foo: 'bar' });
        break;
      case 'Ux':
        new Ux().styledObject({ foo: 'bar' });
        break;
      default:
        throw new Error(`Invalid method: ${this.flags.method}`);
    }
  }

  private runStyledJSON(): void {
    switch (this.flags.method) {
      case '@oclif/core':
        coreUx.styledJSON({ foo: 'bar' });
        break;
      case 'SfCommand':
        this.styledJSON({ foo: 'bar' });
        break;
      case 'Ux':
        new Ux().styledJSON({ foo: 'bar' });
        break;
      default:
        throw new Error(`Invalid method: ${this.flags.method}`);
    }
  }

  private runSpinner(): void {
    switch (this.flags.method) {
      case '@oclif/core':
        coreUx.action.start('starting spinner');
        coreUx.action.stop('done');
        break;
      case 'SfCommand':
        this.spinner.start('starting spinner');
        this.spinner.stop('done');
        break;
      case 'Ux':
        new Ux().spinner.start('starting spinner');
        new Ux().spinner.stop('done');
        break;
      default:
        throw new Error(`Invalid method: ${this.flags.method}`);
    }
  }
}

describe('makeUxStubs', () => {
  let uxStubs: ReturnType<typeof makeUxStubs>;
  let sandbox: SinonSandbox;

  beforeEach(() => {
    sandbox = createSandbox();
    uxStubs = makeUxStubs(sandbox);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('@oclif/core ux utilities', () => {
    it('should stub ux.info', () => {
      coreUx.info('hello');
      expect(uxStubs['@oclif/core'].info.firstCall.args).to.deep.equal(['hello']);
    });

    it('should stub ux.log', () => {
      coreUx.log('hello');
      expect(uxStubs['@oclif/core'].log.firstCall.args).to.deep.equal(['hello']);
    });

    it('should stub ux.warn', () => {
      coreUx.warn('hello');
      expect(uxStubs['@oclif/core'].warn.firstCall.args).to.deep.equal(['hello']);
    });

    it('should stub ux.annotation', () => {
      coreUx.annotation('hello', 'world');
      expect(uxStubs['@oclif/core'].annotation.firstCall.args).to.deep.equal(['hello', 'world']);
    });

    it('should stub ux.table', () => {
      coreUx.table(TABLE_DATA, TABLE_COLUMNS);
      expect(uxStubs['@oclif/core'].table.firstCall.args).to.deep.equal([TABLE_DATA, TABLE_COLUMNS]);
    });

    it('should stub ux.url', () => {
      coreUx.url('oclif', 'oclif.io');
      expect(uxStubs['@oclif/core'].url.firstCall.args).to.deep.equal(['oclif', 'oclif.io']);
    });

    it('should stub ux.styledHeader', () => {
      coreUx.styledHeader('hello');
      expect(uxStubs['@oclif/core'].styledHeader.firstCall.args).to.deep.equal(['hello']);
    });

    it('should stub ux.styledObject', () => {
      coreUx.styledObject({ foo: 'bar' });
      expect(uxStubs['@oclif/core'].styledObject.firstCall.args).to.deep.equal([{ foo: 'bar' }]);
    });

    it('should stub ux.styledJSON', () => {
      coreUx.styledJSON({ foo: 'bar' });
      expect(uxStubs['@oclif/core'].styledJSON.firstCall.args).to.deep.equal([{ foo: 'bar' }]);
    });

    it('should stub ux.action.start', () => {
      coreUx.action.start('doing something');
      expect(uxStubs['@oclif/core'].startSpinner.firstCall.args).to.deep.equal(['doing something']);
    });

    it('should stub ux.action.stop', () => {
      coreUx.action.stop('done');
      expect(uxStubs['@oclif/core'].stopSpinner.firstCall.args).to.deep.equal(['done']);
    });
  });

  describe('SfCommand methods', () => {
    it('should stub log', async () => {
      await Cmd.run(['--log', '--method=SfCommand']);
      expect(uxStubs.SfCommand.log.firstCall.args).to.deep.equal(['hello']);
    });

    it('should stub logSuccess', async () => {
      await Cmd.run(['--logSuccess', '--method=SfCommand']);
      expect(uxStubs.SfCommand.logSuccess.firstCall.args).to.deep.equal(['hello']);
    });

    it('should stub logSensitive', async () => {
      await Cmd.run(['--logSensitive', '--method=SfCommand']);
      expect(uxStubs.SfCommand.logSensitive.firstCall.args).to.deep.equal(['hello']);
    });

    it('should stub logToStderr', async () => {
      await Cmd.run(['--logToStderr', '--method=SfCommand']);
      expect(uxStubs.SfCommand.logToStderr.firstCall.args).to.deep.equal(['hello']);
    });

    it('should stub warn', async () => {
      await Cmd.run(['--warn', '--method=SfCommand']);
      expect(uxStubs.SfCommand.warn.firstCall.args).to.deep.equal(['hello']);
    });

    it('should stub table', async () => {
      await Cmd.run(['--table', '--method=SfCommand']);
      expect(uxStubs.SfCommand.table.firstCall.args).to.deep.equal([TABLE_DATA, TABLE_COLUMNS]);
    });

    it('should stub url', async () => {
      await Cmd.run(['--url', '--method=SfCommand']);
      expect(uxStubs.SfCommand.url.firstCall.args).to.deep.equal(['oclif', 'https://oclif.io']);
    });

    it('should stub styledHeader', async () => {
      await Cmd.run(['--styledHeader', '--method=SfCommand']);
      expect(uxStubs.SfCommand.styledHeader.firstCall.args).to.deep.equal(['hello']);
    });

    it('should stub styledObject', async () => {
      await Cmd.run(['--styledObject', '--method=SfCommand']);
      expect(uxStubs.SfCommand.styledObject.firstCall.args).to.deep.equal([{ foo: 'bar' }]);
    });

    it('should stub styledJSON', async () => {
      await Cmd.run(['--styledJSON', '--method=SfCommand']);
      expect(uxStubs.SfCommand.styledJSON.firstCall.args).to.deep.equal([{ foo: 'bar' }]);
    });

    it('should stub spinner', async () => {
      await Cmd.run(['--spinner', '--method=SfCommand']);
      expect(uxStubs.SfCommand.startSpinner.firstCall.args).to.deep.equal(['starting spinner']);
      expect(uxStubs.SfCommand.stopSpinner.firstCall.args).to.deep.equal(['done']);
    });
  });

  describe('@oclif/core ux utilities run in SfCommand', () => {
    it('should stub log', async () => {
      await Cmd.run(['--log', '--method=@oclif/core']);
      expect(uxStubs['@oclif/core'].log.firstCall.args).to.deep.equal(['hello']);
    });

    it('should stub warn', async () => {
      await Cmd.run(['--warn', '--method=@oclif/core']);
      expect(uxStubs['@oclif/core'].warn.firstCall.args).to.deep.equal(['hello']);
    });

    it('should stub table', async () => {
      await Cmd.run(['--table', '--method=@oclif/core']);
      expect(uxStubs['@oclif/core'].table.firstCall.args).to.deep.equal([TABLE_DATA, TABLE_COLUMNS]);
    });

    it('should stub url', async () => {
      await Cmd.run(['--url', '--method=@oclif/core']);
      expect(uxStubs['@oclif/core'].url.firstCall.args).to.deep.equal(['oclif', 'https://oclif.io']);
    });

    it('should stub styledHeader', async () => {
      await Cmd.run(['--styledHeader', '--method=@oclif/core']);
      expect(uxStubs['@oclif/core'].styledHeader.firstCall.args).to.deep.equal(['hello']);
    });

    it('should stub styledObject', async () => {
      await Cmd.run(['--styledObject', '--method=@oclif/core']);
      expect(uxStubs['@oclif/core'].styledObject.firstCall.args).to.deep.equal([{ foo: 'bar' }]);
    });

    it('should stub styledJSON', async () => {
      await Cmd.run(['--styledJSON', '--method=@oclif/core']);
      expect(uxStubs['@oclif/core'].styledJSON.firstCall.args).to.deep.equal([{ foo: 'bar' }]);
    });

    it('should stub spinner', async () => {
      await Cmd.run(['--spinner', '--method=@oclif/core']);
      expect(uxStubs['@oclif/core'].startSpinner.firstCall.args).to.deep.equal(['starting spinner']);
      expect(uxStubs['@oclif/core'].stopSpinner.firstCall.args).to.deep.equal(['done']);
    });
  });

  describe('Ux methods run in SfCommand', () => {
    it('should stub log', async () => {
      await Cmd.run(['--log', '--method=Ux']);
      expect(uxStubs.Ux.log.firstCall.args).to.deep.equal(['hello']);
    });

    it('should stub warn', async () => {
      await Cmd.run(['--warn', '--method=Ux']);
      expect(uxStubs.Ux.warn.firstCall.args).to.deep.equal(['hello']);
    });

    it('should stub table', async () => {
      await Cmd.run(['--table', '--method=Ux']);
      expect(uxStubs.Ux.table.firstCall.args).to.deep.equal([TABLE_DATA, TABLE_COLUMNS]);
    });

    it('should stub url', async () => {
      await Cmd.run(['--url', '--method=Ux']);
      expect(uxStubs.Ux.url.firstCall.args).to.deep.equal(['oclif', 'https://oclif.io']);
    });

    it('should stub styledHeader', async () => {
      await Cmd.run(['--styledHeader', '--method=Ux']);
      expect(uxStubs.Ux.styledHeader.firstCall.args).to.deep.equal(['hello']);
    });

    it('should stub styledObject', async () => {
      await Cmd.run(['--styledObject', '--method=Ux']);
      expect(uxStubs.Ux.styledObject.firstCall.args).to.deep.equal([{ foo: 'bar' }]);
    });

    it('should stub styledJSON', async () => {
      await Cmd.run(['--styledJSON', '--method=Ux']);
      expect(uxStubs.Ux.styledJSON.firstCall.args).to.deep.equal([{ foo: 'bar' }]);
    });

    it('should stub spinner', async () => {
      await Cmd.run(['--spinner', '--method=Ux']);
      expect(uxStubs.Ux.startSpinner.firstCall.args).to.deep.equal(['starting spinner']);
      expect(uxStubs.Ux.stopSpinner.firstCall.args).to.deep.equal(['done']);
    });
  });
});
