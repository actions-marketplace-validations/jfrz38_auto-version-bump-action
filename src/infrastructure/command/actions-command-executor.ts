import * as exec from '@actions/exec';
import type { CommandExecutor } from '../../domain/ports/command-executor';

export class ActionsCommandExecutor implements CommandExecutor {
  async exec(command: string, args: string[], options: { cwd: string }): Promise<void> {
    await exec.exec(command, args, options);
  }
}
