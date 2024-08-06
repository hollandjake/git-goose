import mongoose, { Schema, Types } from 'mongoose';
import { describe, expect, test } from 'vitest';
import { GitError } from '../lib/errors';
import { git } from '../lib/plugin';
import { Commit, committable, Diff } from '../lib/types';

describe('committable', () => {
  test('truthy', () => {
    const schema = new Schema({}).plugin(git);
    expect(() => committable(mongoose.model('test', schema))).not.toThrow(GitError);
  });
  test('falsy', () => {
    const schema = new Schema({});
    expect(() => committable(mongoose.model('test', schema))).toThrow(GitError);
  });
});

describe('Diff', () => {
  test('single commit', () => {
    const commitAId = new Types.ObjectId();
    const commitA: Commit = {
      _id: commitAId,
      id: commitAId.toString(),
      date: new Date(),
      patches: [{ op: 'add', path: '/a', value: 'a' }],
    };
    const d = new Diff(commitA);
    expect(d.ops()).toEqual([{ op: 'add', path: '/a', value: 'a' }]);
  });
  test('multiple commits', () => {
    const commitAId = new Types.ObjectId();
    const commitA: Commit = {
      _id: commitAId,
      id: commitAId.toString(),
      date: new Date(),
      patches: [{ op: 'add', path: '/a', value: 'a' }],
    };
    const commitBId = new Types.ObjectId();
    const commitB: Commit = {
      _id: commitBId,
      id: commitBId.toString(),
      date: new Date(),
      patches: [{ op: 'add', path: '/b', value: 'b' }],
    };
    const d = new Diff(commitA, commitB);
    expect(d.ops()).toEqual([
      { op: 'add', path: '/a', value: 'a' },
      { op: 'add', path: '/b', value: 'b' },
    ]);
  });
  test('multiple commits unordered', () => {
    const commitAId = new Types.ObjectId();
    const commitA: Commit = {
      _id: commitAId,
      id: commitAId.toString(),
      date: new Date(),
      patches: [{ op: 'add', path: '/a', value: 'a' }],
    };
    const commitBId = new Types.ObjectId();
    const commitB: Commit = {
      _id: commitBId,
      id: commitBId.toString(),
      date: new Date(),
      patches: [{ op: 'add', path: '/b', value: 'b' }],
    };
    const d = new Diff(commitB, commitA);
    expect(d.ops()).toEqual([
      { op: 'add', path: '/a', value: 'a' },
      { op: 'add', path: '/b', value: 'b' },
    ]);
  });
});
