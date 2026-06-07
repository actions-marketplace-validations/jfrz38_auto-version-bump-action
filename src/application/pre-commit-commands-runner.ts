import { type PreCommitCommands } from '../domain/config/pre-commit-commands';
import type { CommandExecutor } from '../domain/ports/command-executor';
import type { GitRepository } from '../domain/ports/git-repository';

export class PreCommitCommandsRunner {
  constructor(
    private readonly commandExecutor: CommandExecutor,
    private readonly gitRepository: GitRepository,
  ) { }

  async run(cwd: string, commands: PreCommitCommands, baselineChangedFiles: string[]): Promise<string[]> {
    for (const command of commands.values) {
      await this.commandExecutor.exec(command, [], { cwd });
    }

    return (await this.gitRepository.getChangedFiles()).filter((filePath) => !baselineChangedFiles.includes(filePath));
  }
}
