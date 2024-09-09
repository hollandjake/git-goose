import { Patch, apply as applyBase, create as createBase } from 'mini-rfc6902';
import { clone, diff, eq } from '../rfc6902';

export function create(input: unknown, output: unknown) {
  return createBase(input, output, {
    eq,
    diff,
    clone,
    transform: 'minify',
  });
}

export function apply(input: unknown, patch: Patch) {
  return applyBase(input, patch, {
    clone,
    transform: 'minify',
  });
}
