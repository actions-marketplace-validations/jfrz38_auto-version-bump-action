import { describe, expect, it } from 'vitest';
import { BooleanInput } from '../../../src/domain/config/boolean-input';
import { StrategyName } from '../../../src/domain/config/strategy-name';

describe('domain value objects', () => {
  it('parses boolean inputs with defaults', () => {
    expect(BooleanInput.fromInput('draft', '', true).value).toBe(true);
    expect(BooleanInput.fromInput('draft', 'false', true).value).toBe(false);
    expect(() => BooleanInput.fromInput('draft', 'maybe', true)).toThrow('must be either "true" or "false"');
  });

  it('validates strategy names', () => {
    expect(StrategyName.fromInput('npm').value).toBe('npm');
    expect(StrategyName.fromInput('regex').isRegex()).toBe(true);
    expect(() => StrategyName.fromInput('maven')).toThrow('Invalid strategy');
  });
});
