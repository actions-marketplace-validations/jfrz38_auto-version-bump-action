export class PreCommitCommands {
  private constructor(readonly values: string[]) {}

  static fromInput(input: string): PreCommitCommands {
    return new PreCommitCommands(
      input
        .split(/\r?\n/)
        .map((command) => command.trim())
        .filter((command) => command.length > 0),
    );
  }
}
