const OUTPUT_SEPARATOR = '\n';

export class ChangedFiles {
  private constructor(readonly values: string[]) {}

  static from(values: string[]): ChangedFiles {
    return new ChangedFiles([...new Set(values)]);
  }

  assertNotEmpty(): void {
    if (this.values.length === 0) {
      throw new Error('No version change was applied.');
    }
  }

  toOutputString(): string {
    return this.values.join(OUTPUT_SEPARATOR);
  }
}
