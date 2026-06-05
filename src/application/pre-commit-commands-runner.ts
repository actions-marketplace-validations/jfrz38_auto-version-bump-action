import * as exec from '@actions/exec';
import { type PreCommitCommands } from '../domain/pre-commit-commands';
import { getChangedFiles } from '../git';

export class PreCommitCommandsRunner {
  constructor(private readonly cwd: string) {}

  async run(commands: PreCommitCommands, baselineChangedFiles: string[]): Promise<string[]> {
    for (const command of commands.values) {
      await exec.exec(command, [], { cwd: this.cwd });
    }

    return (await getChangedFiles()).filter((filePath) => !baselineChangedFiles.includes(filePath));
  }
}
