import { expect, test } from 'vitest';
import { GitModel } from '../lib/model';

test('model caching', () => {
  const modelA = GitModel('test');
  const modelB = GitModel('test');
  expect(modelA).toBe(modelB);

  const modelC = GitModel('another-test');
  expect(modelA).not.toBe(modelC);
});
