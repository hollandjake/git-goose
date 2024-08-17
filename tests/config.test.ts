import { describe, test } from 'vitest';
import { getPatcher, Patchers } from '../lib/config';
import { GitError } from '../lib/errors';
import { Patch } from '../lib/patchers/rfc6902';

describe.concurrent('Patchers', () => {
  const scenarios = [
    // No Change
    [null, null],
    [{}, {}],
    [{ a: 'a' }, { a: 'a' }],
    // Null checks
    [null, {}],
    [{}, null],
    [null, { a: 'a' }],
    // Root Property Changes
    [{ a: 'a' }, { a: 'b' }],
    [{ a: 'a' }, { a: 'a', b: 'b' }],
    [{ a: 'a', b: 'b' }, { a: 'a' }],
  ];
  describe('json-patch', () => {
    const patcher = Patchers['json-patch'];

    const patches = [
      null,
      null,
      null,
      [{ op: 'replace', path: '', value: {} }],
      [{ op: 'replace', path: '', value: null }],
      [{ op: 'replace', path: '', value: { a: 'a' } }],
      [{ op: 'replace', path: '/a', value: 'b' }],
      [{ op: 'add', path: '/b', value: 'b' }],
      [{ op: 'remove', path: '/b' }],
    ];

    test.for(scenarios.map((s, i) => [...s, patches[i]]))('create(%j, %j)', async ([a, b, expected], { expect }) => {
      expect(patcher.create(a, b)).toEqual(expected);
    });
    test.for(scenarios.map(([a, b], i) => [a, patches[i], b]))('apply(%j, %j)', ([a, b, expected], { expect }) => {
      expect(patcher.apply(a, b as Patch)).toEqual(expected);
    });
  });
});

describe.concurrent('getPatcher', () => {
  test('can fetch existing patcher', async ({ expect }) => {
    const patcher = getPatcher('json-patch');

    expect(patcher.create).toBeInstanceOf(Function);
    expect(patcher.apply).toBeInstanceOf(Function);
  });
  test('should throw error on missing provider', async ({ expect }) => {
    expect(() => getPatcher('invalid' as never)).toThrow(GitError);
  });
  test('should throw error on misconfigured provider create function', async ({ expect }) => {
    Patchers['test' as never] = {
      create: undefined,
    } as never;
    expect(() => getPatcher('test' as never)).toThrow(GitError);
    // Cleanup
    delete Patchers['test' as never];
  });
  test('should throw error on misconfigured provider apply function', async ({ expect }) => {
    Patchers['test' as never] = {
      create: () => ({}),
      apply: undefined,
    } as never;
    expect(() => getPatcher('test' as never)).toThrow(GitError);
    // Cleanup
    delete Patchers['test' as never];
  });
});
