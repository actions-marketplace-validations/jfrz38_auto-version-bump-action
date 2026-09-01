export class Commit {
  private constructor(readonly message: string) {
    if (!message.trim()) {
      throw new Error('Commit message must not be empty.');
    }
  }

  static create(message: string): Commit {
    return new Commit(message);
  }
}
