import { apply as applyBase, Cloner, create as createBase, Differ, EqFunc, Patch } from 'mini-rfc6902';
import { Types } from 'mongoose';

export const eq: EqFunc = (a, b, opts) => {
  if (a instanceof Types.ObjectId && b instanceof Types.ObjectId) {
    return a.equals(b);
  } else if (a instanceof Types.Decimal128 && b instanceof Types.Decimal128) {
    return !a.bytes.some((v, k) => v !== b.bytes[k]);
  }
  opts.skip();
  return false;
};
export const diff: Differ = (a, b, ptr, opts) => {
  if (a instanceof Types.ObjectId && b instanceof Types.ObjectId) {
    return eq(a, b, opts) ? [] : [['~', ptr, b]];
  } else if (a instanceof Types.Decimal128 && b instanceof Types.Decimal128) {
    return eq(a, b, opts) ? [] : [['~', ptr, b]];
  }
  opts.skip();
  return [];
};
export const clone: Cloner = (val, opts) => {
  if (val instanceof Types.ObjectId) return new Types.ObjectId(val.id);
  if (val instanceof Types.Decimal128) return Types.Decimal128.fromString(val.toString());
  return opts.skip();
};

export function create(input: unknown, output: unknown) {
  return createBase(input, output, {
    diff,
    eq,
    clone,
    transform: 'maximize',
  });
}

export function apply(input: unknown, patch: Patch) {
  return applyBase(input, patch, {
    clone,
    transform: 'maximize',
  });
}
