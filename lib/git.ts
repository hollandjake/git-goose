import mongoose, {
  type Document,
  type FilterQuery,
  type ProjectionType,
  type QueryOptions,
  type Types,
} from 'mongoose';
import { applyPatch, createPatch } from 'rfc6902';
import { GitError } from './errors';
import { GitModel, type ModelOptions } from './model';
import { type DBCommit, DBCommitModel } from './schemas';
import { type Commit, type CommittableDocument, Diff } from './types';

export const HEAD = '__git_head';
export const GIT = '__git';

/** The ID of the Commit, Note here it is not a SHA1 hash and instead is a BSON ObjectId */
export type CommitHash = Types.ObjectId | string;

type GitOffsetSymbol = '~' | '^';
type GitRootSymbol = 'HEAD' | '@';
export type CommitOffset = `${GitRootSymbol}${GitOffsetSymbol}` | `${GitRootSymbol}${GitOffsetSymbol}${number}`;

/** String representation of a Date */
export type DateString = string;

/** Identifier for a commit */
export type CommitRef = CommitHash | DateString | Date | number | CommitOffset;

export type GitOptions = {
  collectionName?: string;
  collectionSuffix?: string;
  snapshotWindow?: number;
} & Partial<ModelOptions>;

export class Git<T extends object> {
  protected readonly model: DBCommitModel<T>;
  protected readonly doc: CommittableDocument<T>;
  protected readonly target: unknown;
  protected readonly snapshotWindow: number;

  constructor(
    doc: CommittableDocument<T>,
    { collectionName, collectionSuffix = '.git', snapshotWindow = 100, db }: GitOptions = {}
  ) {
    this.doc = doc;
    this.target = this.doc._id;
    this.model = GitModel<T>(collectionName ?? doc.collection.name + collectionSuffix, { db: db ?? doc.db });
    this.snapshotWindow = snapshotWindow;
  }

  async log(
    filter?: FilterQuery<Commit>,
    projection?: ProjectionType<Commit> | null | undefined,
    options?: QueryOptions<Commit> & {
      lean: true;
    }
  ) {
    return new Diff(
      ...(await this.model
        .find<Document<Types.ObjectId, {}, DBCommit<T, CommittableDocument<T>['_id']>>>(
          {
            ...filter,
            target: this.target,
          },
          projection ?? {},
          {
            sort: { date: -1 },
            limit: 10,
            ...options,
          }
        )
        .transform(commits =>
          commits.map(c => {
            const { target: _target, snapshot: _snapshot, ...o } = c.toObject({ virtuals: ['id'] });
            return o;
          })
        ))
    );
  }

  /**
   * Show the working tree status
   *
   * Displays paths that have differences between the active document and the current HEAD commit
   */
  async status() {
    const head = (this.doc.$locals[HEAD] as object) ?? {};
    const current = this.objectifyDoc();

    return createPatch(head, current);
  }

  /**
   * Show changes between commits, commit and working tree
   */
  async diff(commit: CommitRef) {
    const targetCommit = await this.buildCommit(commit);
    return createPatch(targetCommit, this.objectifyDoc());
  }

  /**
   * Create a new document which is a copy of the current document as it was at the point of the commit
   * @param commit - The reference to the time at which we want to view
   */
  async checkout(commit: CommitRef): Promise<Document<T>> {
    const targetCommit = await this.buildCommit(commit);

    return this.doc.model().hydrate(targetCommit);
  }

  protected objectifyDoc(): object {
    return this.doc.toObject({
      virtuals: false,
      depopulate: true,
    });
  }

  /**
   * Save an object
   */
  protected async commit(): Promise<void> {
    const curr = this.objectifyDoc();
    const head: object = this.doc.$locals[HEAD] ?? {};

    const initialCommit = !this.doc.$locals[HEAD];

    const patches = createPatch(head, curr);
    if (patches.length) {
      let snapshot;
      if ((await this.model.countDocuments({ target: this.target })) % this.snapshotWindow === 0) {
        // Generate snapshot
        snapshot = curr;
      }
      await this.model.create({ target: this.target, patches, snapshot, initialCommit });
    }
    this.doc.$locals[HEAD] = curr;
  }

  protected async findCommit(commit: CommitRef): Promise<Omit<DBCommit, 'snapshot'>> {
    if (typeof commit === 'string') {
      if (/^(HEAD|@)/.test(commit)) {
        const matcher = /^(HEAD|@)([\\^~](\d*))?$/.exec(commit);
        if (matcher) {
          commit = matcher[2] ? (matcher[3] ? parseInt(matcher[3]) : 1) : 0;
        }
      } else if (!isNaN(Date.parse(commit))) {
        // Convert date string to Date
        commit = new Date(commit);
      }
    }

    if (typeof commit === 'number') {
      // Find the nth commit from head
      return this.model
        .findOne({ target: this.target }, {}, { sort: { _id: -1 }, skip: Math.abs(commit) })
        .orFail(() => new GitError(`No commit found with offset ${commit}`));
    }

    if (commit instanceof Date) {
      // Find the first commit in the future from this date (inclusive)
      const matchedByDate = await this.model
        .findOne(
          {
            target: this.target,
            date: { $gte: commit },
          },
          {},
          { sort: { _id: 1 } }
        )
        .orFail(() => new GitError(`No commit found with date '${commit}'`));

      if (matchedByDate.initialCommit && matchedByDate.date > commit) {
        throw new GitError(`No commit found with date '${commit}'`);
      }
      return matchedByDate;
    }

    if (mongoose.isObjectIdOrHexString(commit)) {
      return this.model
        .findOne({ target: this.target, _id: commit })
        .orFail(() => new GitError(`No commit found with id '${commit}'`));
    }

    throw new GitError(`Invalid commit identifier '${commit}'`);
  }

  protected async buildCommit(commit: CommitRef): Promise<T> {
    const targetCommit = await this.findCommit(commit);

    // Find the most recent snapshot commit before the target commit
    const snapshotCommit = await this.model.findOne(
      {
        target: this.target,
        _id: { $lte: targetCommit._id },
        snapshot: { $exists: true },
      },
      { _id: true, snapshot: true },
      { sort: { date: -1 } }
    );

    // Fetch any remaining transformations
    const targetTransforms = await this.model
      .find(
        {
          target: this.target,
          _id: { $lte: targetCommit._id, ...(snapshotCommit ? { $gt: snapshotCommit._id } : {}) },
        },
        {},
        { sort: { _id: 1 } }
      )
      .transform(t => t.flatMap(t => t.patches));
    const build = snapshotCommit?.snapshot ?? ({} as T);
    applyPatch(build, targetTransforms);

    return build;
  }
}
