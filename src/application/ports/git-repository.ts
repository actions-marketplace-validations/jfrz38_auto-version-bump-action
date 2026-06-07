export interface GitRepository {
  checkoutBumpBranch(baseBranch: string, branch: string): Promise<void>;
  getChangedFiles(): Promise<string[]>;
}
