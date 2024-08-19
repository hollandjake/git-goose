/* eslint-disable @typescript-eslint/no-explicit-any */

import { expect, test } from 'vitest';
import { Operation, VoidableDiff } from '../diff';
import { applyPatch, createPatch } from '../index';
import { Pointer } from '../pointer';

import { clone } from './_index';

function checkRoundtrip(
  input: any,
  output: any,
  expected_patch: Operation[],
  diff?: VoidableDiff,
  actual_patch: Operation[] = createPatch(input, output, diff)
) {
  expect(actual_patch, 'should produce patch equal to expectation').toEqual(expected_patch);
  const actual_output = applyPatch(clone(input), actual_patch);
  expect(actual_output, 'should apply patch to arrive at output').toEqual(output);
}

test.concurrent('issues/3', () => {
  const input = { arr: ['1', '2', '2'] };
  const output = { arr: ['1'] };
  const expected_patch: Operation[] = [
    { op: 'remove', path: '/arr/1' },
    { op: 'remove', path: '/arr/1' },
  ];
  checkRoundtrip(input, output, expected_patch);
});

test.concurrent('issues/4', () => {
  const input = ['A', 'B'];
  const output = ['B', 'A'];
  const expected_patch: Operation[] = [
    { op: 'add', path: '/0', value: 'B' },
    { op: 'remove', path: '/2' },
  ];
  checkRoundtrip(input, output, expected_patch);
});

test.concurrent('issues/5', () => {
  const input: string[] = [];
  const output = ['A', 'B'];
  const expected_patch: Operation[] = [
    { op: 'add', path: '/-', value: 'A' },
    { op: 'add', path: '/-', value: 'B' },
  ];
  checkRoundtrip(input, output, expected_patch);
});

test.concurrent('issues/9', () => {
  const input = [{ A: 1, B: 2 }, { C: 3 }];
  const output = [{ A: 1, B: 20 }, { C: 3 }];
  const expected_patch: Operation[] = [{ op: 'replace', path: '/0/B', value: 20 }];
  checkRoundtrip(input, output, expected_patch);
});

test.concurrent('issues/12', () => {
  const input = { name: 'ABC', repositories: ['a', 'e'] };
  const output = { name: 'ABC', repositories: ['a', 'b', 'c', 'd', 'e'] };
  const expected_patch: Operation[] = [
    { op: 'add', path: '/repositories/1', value: 'b' },
    { op: 'add', path: '/repositories/2', value: 'c' },
    { op: 'add', path: '/repositories/3', value: 'd' },
  ];
  checkRoundtrip(input, output, expected_patch);
});

test.concurrent('issues/15', () => {
  const customDiff: VoidableDiff = (input: any, output: any, ptr: Pointer) => {
    if (input instanceof Date && output instanceof Date && input.valueOf() !== output.valueOf()) {
      return [{ op: 'replace', path: ptr.toString(), value: output }];
    }
    return undefined;
  };
  const input = { date: new Date(0) };
  const output = { date: new Date(1) };
  const expected_patch: Operation[] = [{ op: 'replace', path: '/date', value: new Date(1) }];
  checkRoundtrip(input, output, expected_patch, customDiff);
});

test.concurrent('issues/15/array', () => {
  const customDiff: VoidableDiff = (input: any, output: any, ptr: Pointer) => {
    if (input instanceof Date && output instanceof Date && input.valueOf() !== output.valueOf()) {
      return [{ op: 'replace', path: ptr.toString(), value: output }];
    }
    return undefined;
  };
  const input = [new Date(0)];
  const output = [new Date(1)];
  const expected_patch: Operation[] = [{ op: 'replace', path: '/0', value: new Date(1) }];
  checkRoundtrip(input, output, expected_patch, customDiff);
});

test.concurrent('issues/29', () => {
  /**
   Custom diff function that short-circuits recursion when the last token
   in the current pointer is the key "stop_recursing", such that that key's
   values are compared as primitives rather than objects/arrays.
   */
  const customDiff: VoidableDiff = (input: any, output: any, ptr: Pointer) => {
    if (ptr.tokens[ptr.tokens.length - 1] === 'stop_recursing') {
      // do not compare arrays, replace instead
      return [{ op: 'replace', path: ptr.toString(), value: output }];
    }
    return undefined;
  };

  const input = {
    normal: ['a', 'b'],
    stop_recursing: ['a', 'b'],
  };
  const output = {
    normal: ['a'],
    stop_recursing: ['a'],
  };
  const expected_patch: Operation[] = [
    { op: 'remove', path: '/normal/1' },
    { op: 'replace', path: '/stop_recursing', value: ['a'] },
  ];
  const actual_patch = createPatch(input, output, customDiff);
  checkRoundtrip(input, output, expected_patch, undefined, actual_patch);

  const nested_input = { root: input };
  const nested_output = { root: output };
  const nested_expected_patch: Operation[] = [
    { op: 'remove', path: '/root/normal/1' },
    { op: 'replace', path: '/root/stop_recursing', value: ['a'] },
  ];
  const nested_actual_patch = createPatch(nested_input, nested_output, customDiff);
  checkRoundtrip(nested_input, nested_output, nested_expected_patch, undefined, nested_actual_patch);
});

test.concurrent('issues/33', () => {
  const object = { root: { 0: 4 } };
  const array = { root: [4] };
  checkRoundtrip(object, array, [{ op: 'replace', path: '/root', value: [4] }]);
  checkRoundtrip(array, object, [{ op: 'replace', path: '/root', value: { 0: 4 } }]);
});

test.concurrent('issues/34', () => {
  const input = [3, 4];
  const output = [3, 4];
  delete output[0];
  const expected_patch: Operation[] = [{ op: 'replace', path: '/0', value: undefined }];
  checkRoundtrip(input, output, expected_patch);
});

test.concurrent('issues/35', () => {
  const input = { name: 'bob', image: undefined, cat: null };
  const output = { name: 'bob', image: 'foo.jpg', cat: 'nikko' };
  const expected_patch: Operation[] = [
    { op: 'add', path: '/image', value: 'foo.jpg' },
    { op: 'replace', path: '/cat', value: 'nikko' },
  ];
  checkRoundtrip(input, output, expected_patch);
});

test.concurrent('issues/36', () => {
  const input = [undefined, 'B']; // same as: const input = ['A', 'B']; delete input[0]
  const output = ['A', 'B'];
  const expected_patch: Operation[] = [
    // could also be {op: 'add', ...} -- the spec isn't clear on what constitutes existence for arrays
    { op: 'replace', path: '/0', value: 'A' },
  ];
  checkRoundtrip(input, output, expected_patch);
});

test.concurrent('issues/37', () => {
  const value = { id: 'chbrown' };
  const output = applyPatch(value, [{ op: 'copy', from: '/id', path: '/name' }]);
  const expected_value = { id: 'chbrown', name: 'chbrown' };
  expect(output, 'should apply patch to arrive at output').toEqual(expected_value);
});

test.concurrent('issues/76', () => {
  expect(({} as any).polluted === undefined, 'Object prototype should not be polluted').toBe(true);
  const value = {};
  applyPatch(value, [{ op: 'add', path: '/__proto__/polluted', value: 'Hello!' }]);
  expect(({} as any).polluted === undefined, 'Object prototype should not be polluted').toBe(true);
  expect(({} as any).polluted === undefined, 'Object prototype should still not be polluted').toBe(true);
});

test.concurrent('issues/78', () => {
  const user = { firstName: 'Chris' };
  applyPatch(user, [{ op: 'add', path: '/createdAt', value: new Date('2010-08-10T22:10:48Z') }]);
  expect(user['createdAt' as never], 'should add Date recoverably').toEqual(new Date('2010-08-10T22:10:48Z'));
});

test.concurrent('issues/78-create', () => {
  const userA = { firstName: 'Chris', createdAt: new Date(2010, 7, 10, 22, 10, 48) };
  const userB = { firstName: 'Chris', createdAt: new Date(2011, 7, 10, 22, 10, 48) };
  expect(createPatch(userA, userB)).toEqual([
    {
      op: 'replace',
      path: '/createdAt',
      value: new Date(2011, 7, 10, 22, 10, 48),
    },
  ]);

  expect(createPatch(userA, userA)).toEqual([]);
});
