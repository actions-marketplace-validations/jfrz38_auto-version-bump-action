const TRUE = 'true';
const FALSE = 'false';

export class BooleanInput {
  private constructor(readonly value: boolean) {}

  static fromInput(name: string, value: string, defaultValue: boolean): BooleanInput {
    const normalized = value.trim().toLowerCase();
    if (!normalized) {
      return new BooleanInput(defaultValue);
    }
    if (normalized === TRUE) {
      return new BooleanInput(true);
    }
    if (normalized === FALSE) {
      return new BooleanInput(false);
    }

    throw new Error(`Input "${name}" must be either "${TRUE}" or "${FALSE}".`);
  }
}
