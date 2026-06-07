export type StrategyNameValue = 'gradle-kts' | 'npm' | 'regex';

const GRADLE_KTS = 'gradle-kts';
const NPM = 'npm';
const REGEX = 'regex';
const STRATEGY_NAMES = new Set<string>([GRADLE_KTS, NPM, REGEX]);

export class StrategyName {
  private constructor(readonly value: StrategyNameValue) {}

  static fromInput(value: string): StrategyName {
    const normalized = value.trim().toLowerCase();
    if (STRATEGY_NAMES.has(normalized)) {
      return new StrategyName(normalized as StrategyNameValue);
    }

    throw new Error(`Invalid strategy "${value}". Expected gradle-kts, npm, or regex.`);
  }

  isRegex(): boolean {
    return this.value === REGEX;
  }
}
