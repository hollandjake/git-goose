import { type FilterQuery, type ProjectionType, type QueryOptions, Require_id } from 'mongoose';
import { GitError } from '../errors';
import { Commit, CommitRef, Nullable, Patch, PatcherName, RefId } from '../types';
import { GitBase } from './base';

/**
 * Git manager with the knowledge of its target referenceId, enabling contextually aware operations
 *
 * @template TargetDocType - The type of the document to be generated
 * @template TPatcherName - The inferred name of the patcher to use (used for type hinting patches)
 */
export abstract class GitWithContext<TargetDocType, TPatcherName extends PatcherName> extends GitBase<
  TargetDocType,
  TPatcherName
> {
  protected abstract get refId(): RefId;

  /**
   * @param commit - The commit identifier
   */
  public async checkout(commit: CommitRef) {
    return this.checkoutFromRefId(this.refId, commit);
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
    if (commitA === undefined && commitB === undefined) return this.status();
    if (commitA === undefined) [commitA, commitB] = [commitB, undefined];

    if (commitB === undefined) {
      const targetCommit = await this.rebuildCommitFromRefId(this.refId, commitA!);
      return this.createPatch(targetCommit, await this.getActiveDoc());
    }

    return this.diffFromRefId(this.refId, commitA!, commitB);
  }

  /**
   * @param filter - Optional filter for further constraining.
   *     - It will always be constrained by the [target]{@link DBCommit#refId} field
   *     regardless whether you try to override it
   * @param projection - Optional projection on the {@link Commit} model.
   *     - This is scoped on the {@link Commit} type as opposed to the
   *     actual type {@link DBCommit} to influence intent
   *     - If you try to fetch target or snapshot fields despite the warnings, we will remove them post-processing
   * @param options - Optional query options for further modifications of the response data
   *     - Unless overridden it will default sort by descending date and limit to the top 10 commits
   */
  public async log(
    filter?: FilterQuery<Commit>,
    projection?: ProjectionType<Commit> | null,
    options?: QueryOptions<Commit> & { lean: true }
  ): Promise<Commit[]> {
    return this.logFromRefId(this.refId, filter, projection, options);
  }

  /**
   * Show the non-committed changes
   *
   * Returns the difference between the active document and the current HEAD commit
   */
  public async status(): Promise<Patch<TPatcherName>> {
    return this.createPatch(await this.getHeadDoc(), await this.getActiveDoc());
  }

  protected async commit(): Promise<void> {
    throw new GitError('Without a document there is no way to detect any changes');
  }

  /**
   * Fetch the current state of the active working reference document
   */
  protected async getActiveDoc(): Promise<Nullable<Require_id<TargetDocType>>> {
    return this.getHeadDoc();
  }

  /**
   * Fetch the current state of the HEAD commit reference document
   */
  protected async getHeadDoc(): Promise<Nullable<Require_id<TargetDocType>>> {
    return this.rebuildCommitFromRefId(this.refId, 'HEAD');
  }
}
