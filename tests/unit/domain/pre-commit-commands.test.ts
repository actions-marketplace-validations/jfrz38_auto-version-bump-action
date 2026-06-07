import { describe, expect, it } from 'vitest';
import { PreCommitCommands } from '../../../src/domain/config/pre-commit-commands';

describe('PreCommitCommands', () => {
  it('parses one command per non-empty line', () => {
    const commands = PreCommitCommands.fromInput('pnpm install\n\n pnpm run build ');

    expect(commands.values).toEqual(['pnpm install', 'pnpm run build']);
  });

  it('returns no commands for empty input', () => {
    const commands = PreCommitCommands.fromInput('  \n');

    expect(commands.values).toEqual([]);
  });
});
