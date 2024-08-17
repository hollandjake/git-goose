import { expect, test } from 'vitest';
import { applyPatch, createPatch } from '../index';
import { clone } from './_index';

const pairs = [
  [['A', 'Z', 'Z'], ['A']],
  [
    ['A', 'B'],
    ['B', 'A'],
  ],
  [[], ['A', 'B']],
  [
    ['B', 'A', 'M'],
    ['M', 'A', 'A'],
  ],
  [['A', 'A', 'R'], []],
  [
    ['A', 'B', 'C'],
    ['B', 'C', 'D'],
  ],
  [
    ['A', 'C'],
    ['A', 'B', 'C'],
  ],
  [
    ['A', 'B', 'C'],
    ['A', 'Z'],
  ],
];

test.concurrent.for(pairs)('diff+patch: [%s] => [%s]', ([input, output]) => {
  const patch = createPatch(input, output);
  const actual_output = clone(input);
  applyPatch(actual_output, patch);
  expect(actual_output, 'should apply produced patch to arrive at output').toEqual(output);
});
