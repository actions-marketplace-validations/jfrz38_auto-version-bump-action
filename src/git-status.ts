export class GitStatus {
  private constructor(readonly changedFiles: string[]) {}

  static fromPorcelain(status: string): GitStatus {
    const changedFiles: string[] = [];
    const entries = status.split('\0').filter((entry) => entry.length > 0);

    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      const statusCode = entry.slice(0, 2);
      const filePath = entry.slice(3);
      if (!filePath) {
        continue;
      }

      changedFiles.push(filePath);
      if (statusCode.includes('R') || statusCode.includes('C')) {
        index += 1;
      }
    }

    return new GitStatus(changedFiles);
  }
}
