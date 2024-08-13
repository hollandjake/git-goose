import { describe, expect, test } from 'vitest';

import { applyPatch, createPatch } from '../index';
import { Pointer } from '../pointer';

import { clone } from './_index';
import { spec_data } from './spec';

describe('JSON Pointer - rfc-examples', () => {
  // > For example, given the JSON document
  const obj = {
    foo: ['bar', 'baz'],
    '': 0,
    'a/b': 1,
    'c%d': 2,
    'e^f': 3,
    'g|h': 4,
    'i\\j': 5,
    "k'l": 6,
    ' ': 7,
    'm~n': 8,
  };

  // > The following JSON strings evaluate to the accompanying values
  const pointers = [
    { path: '', expected: obj },
    { path: '/foo', expected: ['bar', 'baz'] },
    { path: '/foo/0', expected: 'bar' },
    { path: '/', expected: 0 },
    { path: '/a~1b', expected: 1 },
    { path: '/c%d', expected: 2 },
    { path: '/e^f', expected: 3 },
    { path: '/g|h', expected: 4 },
    { path: '/i\\j', expected: 5 },
    { path: "/k'l", expected: 6 },
    { path: '/ ', expected: 7 },
    { path: '/m~0n', expected: 8 },
  ];

  test.for(pointers)('%s', pointer => {
    const actual = Pointer.fromJSON(pointer.path).evaluate(obj).value;
    expect(actual, `pointer "${pointer.path}" should evaluate to expected output`).toEqual(pointer.expected);
  });
});

describe('JSON Pointer - package example', () => {
  const obj = {
    first: 'chris',
    last: 'brown',
    github: {
      account: {
        id: 'chbrown',
        handle: '@chbrown',
      },
      repos: ['amulet', 'twilight', 'rfc6902'],
      stars: [
        {
          owner: 'raspberrypi',
          repo: 'userland',
        },
        {
          owner: 'angular',
          repo: 'angular.js',
        },
      ],
    },
    'github/account': 'deprecated',
  };

  const pointers = [
    { path: '/first', expected: 'chris' },
    { path: '/github~1account', expected: 'deprecated' },
    { path: '/github/account/handle', expected: '@chbrown' },
    { path: '/github/repos', expected: ['amulet', 'twilight', 'rfc6902'] },
    { path: '/github/repos/2', expected: 'rfc6902' },
    { path: '/github/stars/0/repo', expected: 'userland' },
  ];

  test.for(pointers)('%s', pointer => {
    const actual = Pointer.fromJSON(pointer.path).evaluate(obj).value;
    expect(actual, `pointer "${pointer.path}" should evaluate to expected output`).toEqual(pointer.expected);
  });
});

describe('Specification format', () => {
  describe('patch', () => {
    // take the input, apply the patch, and check the actual result against the
    // expected output
    test.for(spec_data.map(s => [s.name, s] as const))('%s', ([, spec]) => {
      // patch operations are applied to object in-place
      if (spec.throws) {
        expect(() => applyPatch(clone(spec.input), spec.patch)).toThrow(spec.throws);
      } else {
        expect(
          applyPatch(clone(spec.input), spec.patch),
          'should equal expected output after applying patches'
        ).toEqual(spec.output);
      }
    });
  });

  describe('diff', () => {
    test.for(spec_data.filter(spec => spec.diffable).map(s => [s.name, s] as const))('%s', ([, spec]) => {
      // we read this separately because patch is destructive and it's easier just to start with a blank slate
      // ignore spec items that are marked as not diffable
      // perform diff (create patch = list of operations) and check result against non-test patches in spec
      const actual = createPatch(spec.input, spec.output);
      const expected = spec.patch.filter(operation => operation.op !== 'test');
      expect(actual, 'should produce diff equal to spec patch').toEqual(expected);
    });
  });
});
