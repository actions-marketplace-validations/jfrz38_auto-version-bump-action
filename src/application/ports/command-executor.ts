export interface CommandExecutor {
  exec(command: string, args: string[], options: { cwd: string }): Promise<void>;
}
