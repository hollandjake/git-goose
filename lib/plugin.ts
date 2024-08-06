/* eslint @typescript-eslint/ban-ts-comment: 0 */

import { type Schema } from 'mongoose';
import { GIT, Git, type GitOptions, HEAD } from './git';
import { type CommittableDocument } from './types';

export function git<RawDocType extends object>(schema: Schema<RawDocType>, options: GitOptions = {}) {
  schema.virtual('$git').get(function (this: CommittableDocument<RawDocType>): Git<RawDocType> {
    if (!this.$locals[GIT]) {
      this.$locals[GIT] = new Git(this, options);
    }
    return this.$locals[GIT] as Git<RawDocType>;
  });

  /**
   * Run on load from db
   */
  schema.post('init', function (this: CommittableDocument<RawDocType>) {
    // @ts-ignore Allow access to protected property
    this.$locals[HEAD] = this.$git.objectifyDoc();
  });

  /**
   * Run before doing Document.save()
   */
  schema.post('save', async function (this: CommittableDocument<RawDocType>) {
    // @ts-ignore Allow access to protected property
    await this.$git.commit();
  });
}
