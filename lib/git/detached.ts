import { type HydratedDocument } from 'mongoose';
import { GitError } from '../errors';
import { Commit, CommittableDocument, Nullable, Patch, PatcherName, RefId } from '../types';
import { GitBase } from './base';
import { GitFromDocument } from './from_document';
import { GitFromRefId } from './from_refId';

/**
 * Git manager with the knowledge of its target referenceId, enabling contextually aware operations
 *
 * @template TargetDocType - The type of the document to be generated
 * @template TPatcherName - The inferred name of the patcher to use (used for type hinting patches)
 */
export class GitDetached<TargetDocType, TPatcherName extends PatcherName> extends GitBase<TargetDocType, TPatcherName> {
  public async checkout(): Promise<Nullable<HydratedDocument<TargetDocType>>> {
    throw new GitError("Unable to checkout, please specify a referenceId by using 'this.withReference(refId)'");
  }

  public async diff(): Promise<Patch<TPatcherName>> {
    throw new GitError("Unable to compute diff, please specify a referenceId by using 'this.withReference(refId)'");
  }

  public async log(): Promise<Commit[]> {
    throw new GitError("Unable to fetch logs, please specify a referenceId by using 'this.withReference(refId)'");
  }

  /**
   * Create a new Git context with reference to the provided reference id
   *
   * @param refId - The reference object id
   */
  public withRefId(refId: RefId): GitFromRefId<TargetDocType, TPatcherName> {
    return new GitFromRefId(this._referenceModel, refId, this._conf);
  }

  /**
   * Create a new Git context with reference to the provided reference id
   *
   * @param doc - The reference object
   */
  public withDocument<T>(doc: CommittableDocument<T>): GitFromDocument<T, TPatcherName> {
    return new GitFromDocument<T, TPatcherName>(doc, this._conf);
  }

  protected async commit(): Promise<void> {
    throw new GitError(
      "Unable to commit in headless state, please specify an object by using 'this.withDocument(doc)'"
    );
  }
}
