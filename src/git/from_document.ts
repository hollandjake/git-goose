import { Require_id } from 'mongoose';
import { ContextualGitConfig } from '../config';
import { HEAD } from '../consts';
import { getModelFromDoc } from '../mongoose-utils';
import { CommitRef, type CommittableDocument, Patch, PatcherName } from '../types';
import { GitBase } from './base';
import { GitWithContext } from './context';

/**
 * Git manager with a reference to a document, enabling contextual aware operations
 *
 * @template TargetDocType - The type of the {@link doc}
 * @template TPatcherName - The inferred name of the patcher to use (used for type hinting patches)
 */
export class GitFromDocument<TargetDocType, TPatcherName extends PatcherName> extends GitWithContext<
  TargetDocType,
  TPatcherName
> {
  protected readonly doc: CommittableDocument<TargetDocType>;

  constructor(doc: CommittableDocument<TargetDocType>, conf?: Partial<ContextualGitConfig<TPatcherName>>) {
    if (!conf) conf = {};

    const model = getModelFromDoc(doc);

    conf.collectionName =
      conf.collectionName ?? model.collection.collectionName + GitBase.staticConf('collectionSuffix', conf);
    conf.connection = conf.connection ?? model.db;

    super(model, conf);
    this.doc = doc;
  }

  protected objectifyDoc() {
    return this.objectify(this.doc);
  }

  protected get refId() {
    // Here ref is dynamic
    return this.doc._id;
  }

  public async checkout(commit: CommitRef) {
    const targetCommit = await super.checkout(commit);

    return this._referenceModel.hydrate(targetCommit);
  }

  /**
   * Fetch the current state of the active working reference document
   */
  public async getActiveDoc() {
    return this.objectifyDoc();
  }

  public async getHeadDoc() {
    return (this.doc.$locals[HEAD] as Require_id<TargetDocType> | undefined) ?? null;
  }

  /**
   * Fetch the diff for the active document and the current HEAD commit
   *
   * Effectively an alias for {@link status}
   */
  public diff(): Promise<Patch<TPatcherName>>;

  /**
   * Return the difference between the active document and another commit
   *
   * @param commit - A commit identifier
   */
  public diff(commit: CommitRef): Promise<Patch<TPatcherName>>;

  /**
   * @param commitA - A commit identifier
   * @param commitB - A commit identifier
   */
  public async diff(commitA?: CommitRef, commitB?: CommitRef): Promise<Patch<TPatcherName>>;

  /**
   * @param commitA - A commit identifier
   * @param commitB - A commit identifier
   */
  public async diff(commitA?: CommitRef, commitB?: CommitRef): Promise<Patch<TPatcherName>> {
    return super.diff(commitA, commitB);
  }

  protected async commit() {
    const curr = await this.getActiveDoc();
    await super.commit();

    // Update the HEAD
    this.doc.$locals[HEAD] = curr;
  }
}
