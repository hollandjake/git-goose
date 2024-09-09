import { Model, Query, type Schema } from 'mongoose';
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

  schema.virtual('$git').get<CommittableDocument<TargetDocType>>(function () {
    if (!this.$locals[GIT]) this.$locals[GIT] = new GitFromDocument(this, conf);
    return this.$locals[GIT] as GitFromDocument<TargetDocType, TPatcherName>;
  });

  /**
   * Run on load from db
   */
  schema.post<CommittableDocument<TargetDocType>>('init', function () {
    // @ts-ignore Allow access to protected property
    this.$locals[HEAD] = this.$git.objectifyDoc();
  });

  /**
   * Run after doing Document.save()
   *
   * We do this after the save, as we want to ensure that the document is actually saved before we make the
   */
  schema.post<CommittableDocument<TargetDocType>>('save', async function () {
    // @ts-ignore Allow access to protected property
    await this.$git.commit();
  });

  /**
   * Model.updateOne()
   * Model.deleteOne()
   * Model.findOneAndDelete()
   */
  schema.pre<
    Query<never, TargetDocType> & {
      $locals?: Record<string, any>;
    }
  >(['updateOne', 'deleteOne', 'findOneAndDelete'], async function () {
    const affectedId = await this.model.findOne(this.getFilter(), { _id: 1 }, this.getOptions());
    this.$locals = { affectedId: affectedId?._id };
  });
  schema.post<
    Query<any, TargetDocType> & {
      $locals?: Record<string, any>;
    }
  >(['updateOne', 'deleteOne', 'findOneAndDelete'], async function (res) {
    const git = (this.model as CommittableModel).$git();

    // @ts-ignore Allow access to protected property
    if (this.$locals?.affectedId) await git.withRefId(this.$locals.affectedId).commit();
    // @ts-ignore Allow access to protected property
    if (res?.upsertedId) await git.withRefId(res?.upsertedId).commit();
  });

  /**
   * Model.updateMany()
   * Model.deleteMany()
   */
  schema.pre<
    Query<never, TargetDocType> & {
      $locals?: Record<string, any>;
    }
  >(['updateMany', 'deleteMany'], async function () {
    const affectedIds = await this.model
      .find(this.getFilter(), { _id: 1 }, this.getOptions())
      .transform(docs => docs.map(d => d._id));
    this.$locals = { affectedIds };
  });
  schema.post<
    Query<any, TargetDocType> & {
      $locals?: Record<string, any>;
    }
  >(['updateMany', 'deleteMany'], async function (res) {
    const git = (this.model as CommittableModel).$git();
    const session = await git._model.startSession();
    await session.withTransaction(async () => {
      // @ts-ignore Allow access to protected property
      await Promise.all(this.$locals.affectedIds.map(id => git.withRefId(id).commit()));
      // @ts-ignore Allow access to protected property
      if (res?.upsertedId) await git.withRefId(res.upsertedId).commit();
    });
    await session.endSession();
  });

  /**
   * Model.findOneAndUpdate()
   * Model.findOneAndReplace()
   */
  schema.pre<Query<any, TargetDocType>>(['findOneAndUpdate', 'findOneAndReplace'], async function () {
    // TODO: is there a way we can get the updated/upserted id without these constraints (and without a changestream)?
    const userOptions = this.getOptions();
    if (userOptions.upsert && !userOptions.new)
      throw new GitError(
        "Please enable 'new: true' in your query options, and ensure your projection also includes the _id, git-goose is unable to track the changed object without an _id returned"
      );
    // @ts-ignore Need to access the private field where projections are stored
    const userProjection: object = this._fields ?? {};
    if (
      userProjection['-_id' as never] === 0 ||
      userProjection['_id' as never] === 0 ||
      userProjection['_id' as never] === false
    ) {
      throw new GitError(
        "Query projection does not return the '_id' field, git-goose is unable to track the changed object without an _id returned"
      );
    }
  });
  schema.post<Query<any, TargetDocType>>(['findOneAndUpdate', 'findOneAndReplace'], async function (res) {
    if (!res) return;
    if (res._id === undefined) {
      throw new GitError(
        "No _id field found in response, please provide _id in the projection and if using 'upsert' option, please include 'new: true'"
      );
    }

    const git = (this.model as CommittableModel).$git();
    // @ts-ignore Allow access to protected property
    await git.withRefId(res._id).commit();
  });
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
