import type { ActionConfig } from '../../domain/config/action-config';
import type { VersionStrategy } from '../../domain/versioning/version-strategy';
import { GradleKtsStrategy } from './gradle-kts';
import { NpmStrategy } from './npm';
import { RegexStrategy } from './regex';

export function createStrategy(cwd: string, config: ActionConfig): VersionStrategy {
  if (config.strategy.value === 'gradle-kts') {
    return new GradleKtsStrategy(cwd, config.versionFile);
  }
  if (config.strategy.value === 'npm') {
    return new NpmStrategy(cwd, config.versionFile);
  }

  return new RegexStrategy(cwd, config.versionFile, config.versionPattern, config.versionReplacement);
}
