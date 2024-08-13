/* eslint @typescript-eslint/ban-ts-comment: 0 */
/* eslint @typescript-eslint/no-explicit-any: 0 */

import { Model, type Schema } from 'mongoose';
import { ContextualGitConfig } from './config';
import { GIT, HEAD } from './consts';
import { GitError } from './errors';
import { GitDetached, GitFromDocument } from './git';
import { type CommittableDocument, CommittableModel, GlobalPatcherName, PatcherName } from './types';

export function git<TargetDocType, TPatcherName extends PatcherName = GlobalPatcherName>(
  schema: Schema<TargetDocType>,
  conf: Partial<ContextualGitConfig<TPatcherName>> = {}
) {
  schema.static('$git', function (this: Model<TargetDocType> & { $locals?: Record<string, any> }): GitDetached<
    TargetDocType,
    TPatcherName
  > {
    if (!this.$locals) this.$locals = {};
    if (!this.$locals[GIT]) this.$locals[GIT] = new GitDetached(this, conf);
    return this.$locals[GIT];
  });

  schema.virtual('$git').get(function (
    this: CommittableDocument<TargetDocType>
  ): GitFromDocument<TargetDocType, TPatcherName> {
    if (!this.$locals[GIT]) this.$locals[GIT] = new GitFromDocument(this, conf);
    return this.$locals[GIT] as GitFromDocument<TargetDocType, TPatcherName>;
  });

  /**
   * Run on load from db
   */
  schema.post('init', function (this: CommittableDocument<TargetDocType>) {
    // @ts-ignore Allow access to protected property
    this.$locals[HEAD] = this.$git.objectifyDoc();
  });

  /**
   * Run after doing Document.save()
   *
   * We do this after the save, as we want to ensure that the document is actually saved before we make the
   */
  schema.post('save', async function (this: CommittableDocument<TargetDocType>) {
    // @ts-ignore Allow access to protected property
    await this.$git.commit();
  });

  /**
   * Run after Model.updateOne()
   */
  // schema.post('updateOne', async (this: CommittableDocument<RawDocType>, res) => {});
}

/**
 * Typescript type assertion for the CommittableModels
 * @param model - The model which should have had the plugin loaded
 */
export function committable<M extends Model<any>>(model: M): CommittableModel<M> {
  if (!('$git' in model.schema.virtuals))
    throw new GitError(
      "model is missing the '$git' virtual, did you run the plugin command before creating the model?"
    );
  return model as unknown as CommittableModel<M>;
}
