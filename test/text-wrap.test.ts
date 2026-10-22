import { describe, it, expect } from 'vitest';
import { wrapCJKText, measureTextWidth } from '../src/presentation/utils/text-wrap';
import { TACTICS_CONFIG } from '../src/config/tactics.config';

describe('CJK Chinese Text Wrapping Utility', () => {
  it('correctly wraps continuous Chinese text without spaces within maxWidth', () => {
    const text = '连弩与床弩命中敌军附加剧毒使其受治疗效果降低并在秒内持续掉血';
    const maxWidth = 120; // At 14px per char, fits ~8 chars (~112px)
    const wrapped = wrapCJKText(text, maxWidth, { fontSize: 14 });
    const lines = wrapped.split('\n');

    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(measureTextWidth(line, null, 14)).toBeLessThanOrEqual(maxWidth + 14);
    }
  });

  it('correctly formats and prevents text overflow on the user-reported cards', () => {
    const s1 = '连弩与床弩命中敌军附加剧毒，使其受治疗效果降低 30% 并在 5 秒内持续掉血。';
    const s2 = '红衣大炮轰击范围扩大 45%，对已处于灼烧状态的目标必定产生爆轰。';
    const s3 = '火器系器械造成的伤害提升 25%，灼烧持续时间延长 2 秒。';

    const maxWidth = 174;
    for (const desc of [s1, s2, s3]) {
      const wrapped = wrapCJKText(desc, maxWidth, { fontSize: 13.5 });
      const lines = wrapped.split('\n');

      expect(lines.length).toBeGreaterThanOrEqual(2);
      expect(lines.length).toBeLessThanOrEqual(4);

      for (const line of lines) {
        // Line width must not overflow maxWidth (+ hanging punctuation tolerance)
        expect(measureTextWidth(line, null, 13.5)).toBeLessThanOrEqual(maxWidth + 13.5);
      }
    }
  });

  it('handles hanging punctuation so commas/periods do not start a new line isolated', () => {
    const text = '红衣大炮轰击范围扩大 45%，对已处于灼烧状态的目标必定产生爆轰。';
    const wrapped = wrapCJKText(text, 174, { fontSize: 13.5 });
    const lines = wrapped.split('\n');

    for (const line of lines) {
      // Lines should not start with illegal starting punctuation
      expect(line[0]).not.toMatch(/^[，。！？；：）》”、]/);
    }
  });

  it('successfully wraps all 36 tactic descriptions without overflow or content loss', () => {
    const maxWidth = 174;
    expect(TACTICS_CONFIG.length).toBe(36);

    for (const tactic of TACTICS_CONFIG) {
      const wrapped = wrapCJKText(tactic.description, maxWidth, { fontSize: 13.5 });
      const lines = wrapped.split('\n');

      expect(lines.length).toBeGreaterThan(0);
      expect(lines.length).toBeLessThanOrEqual(6);

      for (const line of lines) {
        expect(measureTextWidth(line, null, 13.5)).toBeLessThanOrEqual(maxWidth + 13.5);
      }

      // Reconstructed text (removing whitespace/newlines) matches original
      const cleanOriginal = tactic.description.replace(/\s+/g, '');
      const cleanWrapped = wrapped.replace(/\s+/g, '');
      expect(cleanWrapped).toBe(cleanOriginal);
    }
  });

  it('handles empty strings and single characters gracefully', () => {
    expect(wrapCJKText('', 100)).toBe('');
    expect(wrapCJKText('A', 100)).toBe('A');
    expect(wrapCJKText('字', 100)).toBe('字');
  });
});
