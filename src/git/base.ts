import mongoose, {
  Document,
  type FilterQuery,
  type HydratedDocument,
  Model,
  type ProjectionType,
  type QueryOptions,
  Require_id,
  Types,
} from 'mongoose';
import { ContextualGitConfig, getPatcher, GitConfig, GitGlobalConfig, RequiredConfig } from '../config';
import { GitError } from '../errors';
import { GitModel } from '../model';
import { DBCommit, DBCommitDocument, DBCommitModel } from '../schemas';
import { Commit, CommitRef, GlobalPatcherName, Nullable, Patch, PatcherName, RefId } from '../types';

/**
 * Base Git manager for interacting and manipulating commits and the commit history
 *
 * @template TargetDocType - The type of the document to be generated
 * @template TPatcherName - The inferred name of the patcher to use (used for type hinting patches)
 */
export abstract class GitBase<TargetDocType, TPatcherName extends PatcherName = GlobalPatcherName> {
  /** The configuration */
  protected readonly _conf?: Partial<GitConfig<TPatcherName>>;
  /** The Git Model */
  public readonly _model: DBCommitModel<TargetDocType>;
  /** The internal Model that this git instance is bound to */
  protected readonly _referenceModel: Model<TargetDocType>;

  public constructor(referenceModel: Model<TargetDocType>, conf?: Partial<GitConfig<TPatcherName>>) {
    if (!conf) conf = {};
    conf.collectionName =
      conf.collectionName ?? referenceModel.collection.collectionName + GitBase.staticConf('collectionSuffix', conf);
    conf.connection = conf.connection ?? referenceModel.db;

    this._conf = conf;
    this._referenceModel = referenceModel;
    this._model = GitModel<TargetDocType>(conf);
  }

  protected static staticConf<K extends keyof ContextualGitConfig>(
    key: K,
    conf?: Partial<ContextualGitConfig>
  ): (ContextualGitConfig & Required<(typeof RequiredConfig)[number]>)[K] {
    const val = conf?.[key as never] ?? GitGlobalConfig[key];
    if (!val && RequiredConfig.includes(key)) throw new GitError(`Missing config '${key}'`);

    return val as never;
  }

  /**
   * Restore a commit to a {@link Document} of type {@link TargetDocType}
   */
  public abstract checkout(...args: unknown[]): Promise<Nullable<Require_id<TargetDocType>>>;

  /**
   * Return the difference between two commits
   */
  public abstract diff(...args: unknown[]): Promise<Patch<TPatcherName>>;

  /**
   * Show commit logs
   *
   * Fetch all the commits that match the target id
   */
  public abstract log(...args: unknown[]): Promise<Commit[]>;

  /**
   * Restore a commit to a {@link Document} of type {@link TargetDocType}
   *
   * @param refId - The reference object id
   * @param commit - The commit identifier
   */
  protected async checkoutFromRefId(
    refId: RefId,
    commit: CommitRef
  ): Promise<Nullable<HydratedDocument<TargetDocType>>> {
    const targetCommit = await this.rebuildCommitFromRefId(refId, commit);
    if (!targetCommit) return null;

    return this._referenceModel.hydrate(targetCommit);
  }

  /**
   * Record changes to the document in the commit store
   *
   * If no changes are detected it will skip creation
   */
  protected abstract commit(): Promise<void>;

  /**
   * Record changes to the document in the commit store
   *
   * If no changes are detected it will skip creation
   *
   * @param refId - The reference object id
   * @param prev - The documents previous state
   * @param curr - The documents new state
   */
  protected async commitFromRefId(
    refId: RefId,
    prev: Nullable<TargetDocType>,
    curr: Nullable<TargetDocType>
  ): Promise<void> {
    const patch = await this.createPatch(prev, curr);
    if (patch) {
      let snapshot;
      const snapshotWindow = this.conf('snapshotWindow');
      if (snapshotWindow > 0 && (await this._model.countDocuments({ refId })) % snapshotWindow === 0) {
        // Generate snapshot
        snapshot = curr;
      }
      await this._model.create({ refId, patch, snapshot });
    }
  }

  /**
   * Fetch the value from the config, or defaulting to the global config value
   *
   * @param key - The key to search for
   */
  protected conf<K extends keyof ContextualGitConfig>(
    key: K
  ): (ContextualGitConfig & Required<(typeof RequiredConfig)[number]>)[K] {
    return GitBase.staticConf(key, this._conf);
  }

  /**
   * Create a patch by invoking the configured patcher
   *
   * @param committed - The documents previous state
   * @param active - The documents new state
   */
  protected async createPatch(
    committed: Nullable<TargetDocType>,
    active: Nullable<TargetDocType>
  ): Promise<Nullable<Patch<TPatcherName>>>;

  /**
   * Create a patch by invoking the configured patcher
   *
   * @param committed - The documents previous state
   * @param active - The documents new state
   * @param allowNoop - Allow null patches to be returned
   */
  protected async createPatch(
    committed: Nullable<TargetDocType>,
    active: Nullable<TargetDocType>,
    allowNoop: true
  ): Promise<Patch<TPatcherName>>;

  /**
   * Create a patch by invoking the configured patcher
   *
   * @param committed - The documents previous state
   * @param active - The documents new state
   * @param allowNoop - Allow null patches to be returned
   */
  protected async createPatch(
    committed: Nullable<TargetDocType>,
    active: Nullable<TargetDocType>,
    allowNoop?: true
  ): Promise<Nullable<Patch<TPatcherName>>> {
    const type = this.conf('patcher') as TPatcherName;
    const ops = await getPatcher(type).create(committed, active);
    if (!allowNoop && ops === null) return null;
    return { type, ops } as never;
  }

  /**
   * Return the difference between two commits
   *
   * @param refId - The reference object id
   * @param commitA - A commit identifier
   * @param commitB - A commit identifier
   */
  protected async diffFromRefId(refId: RefId, commitA: CommitRef, commitB: CommitRef): Promise<Patch<TPatcherName>> {
    const [targetA, targetB] = await Promise.all([
      this.rebuildCommitFromRefId(refId, commitA),
      this.rebuildCommitFromRefId(refId, commitB),
    ]);

    return this.createPatch(targetA, targetB, true);
  }

  /**
   * Find commit using an identifier
   *
   * @param refId - The reference object id
   * @param commit - A commit identifier
   */
  protected async findCommitFromRefId(
    refId: RefId,
    commit: CommitRef
  ): Promise<Nullable<DBCommitDocument<TargetDocType>>> {
    // Convert commit into relevant type
    if (typeof commit === 'string') {
      if (/^(HEAD|@)/.test(commit)) {
        // If it starts with HEAD or @ then it's an offset identifier
        const matcher = /^(HEAD|@)([\\^~](\d*))?$/.exec(commit);
        if (!matcher) throw new GitError(`Invalid commit identifier '${commit}'`);
        commit = matcher[2] ? (matcher[3] ? parseInt(matcher[3]) : 1) : 0;
      } else if (mongoose.isObjectIdOrHexString(commit)) {
        // Convert hex string to objectId
        commit = new Types.ObjectId(commit);
      } else if (!isNaN(Date.parse(commit))) {
        // Convert date string to Date
        commit = new Date(commit);
      }
    }

    if (typeof commit === 'number') return this.findCommitByOffsetFromRefId(refId, commit);
    if (commit instanceof Date) return this.findCommitByDateFromRefId(refId, commit);
    if (commit instanceof Types.ObjectId) return this.findCommitByIdFromRefId(refId, commit);

    throw new GitError(`Invalid commit identifier '${commit}'`);
  }

  /**
   * Show commit logs
   *
   * Fetch all the commits that match the target id
   *
   * @param refId - The reference object id
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
  protected async logFromRefId(
    refId: RefId,
    filter?: FilterQuery<Commit>,
    projection?: ProjectionType<Commit> | null,
    options?: QueryOptions<Commit> & { lean: true }
  ): Promise<Commit[]> {
    // Fetch commits for the target, applying and extra options
    const commits = (await this._model.find({ ...filter, refId }, projection, {
      sort: { _id: -1 },
      limit: 10,
      ...options,
    })) as unknown as Document<unknown, {}, DBCommit>[];

    // Remove disallowed fields
    return commits.map(c => c.toObject()).map(({ refId: _target, snapshot: _snapshot, ...o }) => o);
  }

  /**
   * Convert a document into its object form
   *
   * @param doc - The document to convert
   */
  protected objectify(doc: Nullable<Document<unknown, {}, TargetDocType>>): Nullable<Require_id<TargetDocType>> {
    return doc?.toObject({ virtuals: false, depopulate: true }) ?? null;
  }

  /**
   * Reconstruct a commit using an identifier
   *
   * @param refId - The reference object id
   * @param commit - A commit identifier
   * @param nullOnMissingCommit - Return null if the commit doesn't exist
   */
  protected async rebuildCommitFromRefId(
    refId: RefId,
    commit: CommitRef,
    nullOnMissingCommit?: true
  ): Promise<Nullable<Require_id<TargetDocType>>> {
    const targetCommit = await this.findCommitFromRefId(refId, commit);

    if (!targetCommit) {
      if (nullOnMissingCommit) return null;
      throw new GitError(`No commit found for ref '${commit}'`);
    }

    // Find the most recent snapshot commit before the target commit
    const snapshotCommit = await this._model.findOne(
      { refId, _id: { $lte: targetCommit._id }, snapshot: { $exists: true } },
      { _id: true, snapshot: true },
      { sort: { _id: -1 } }
    );

    // Construct the commit
    let build = snapshotCommit?.snapshot ?? null;

    // apply any remaining transformations
    for await (const t of this._model
      .find(
        {
          refId,
          _id: { $lte: targetCommit._id, ...(snapshotCommit ? { $gt: snapshotCommit._id } : {}) },
        },
        {},
        { sort: { _id: 1 } }
      )
      .cursor()) {
      build = t.patch.apply(build);
    }

    return build;
  }

  /**
   * Find a commit by a date identifier
   *
   * Returns the latest commit that matches the date
   *
   * If the date is in the future, that is fine, it will return the HEAD commit,
   * effectively answering the question
   *
   * _"if I was to time travel to {@link date} what would the object look like?"_
   *
   * This also means that going backwards in time to before the object
   * was first initialised, means you will get null
   *
   * @param refId - The reference object id
   * @param date - The date in question
   */
  private async findCommitByDateFromRefId(
    refId: RefId,
    date: Date
  ): Promise<Nullable<DBCommitDocument<TargetDocType>>> {
    return this._model.findOne<DBCommitDocument<TargetDocType>>(
      { refId, date: { $lte: date } },
      {},
      { sort: { _id: -1 } }
    );
  }

  /**
   * Find a commit by its unique identifier
   *
   * @param refId - The reference object id
   * @param commit - The commit id
   */
  private async findCommitByIdFromRefId(
    refId: RefId,
    commit: Types.ObjectId
  ): Promise<Nullable<DBCommitDocument<TargetDocType>>> {
    return this._model.findOne<DBCommitDocument<TargetDocType>>({ refId, _id: commit });
  }

  /**
   * Find a commit in the past using a numerical offset
   *
   * If you supply a negative number, it is assumed to be a mistake as you cannot have a commit in the future.
   * So it will be inverted for you
   *
   * @param refId - The reference object id
   * @param offset - The number of commits to offset by, 0 being the HEAD commit
   */
  private async findCommitByOffsetFromRefId(
    refId: RefId,
    offset: number
  ): Promise<Nullable<DBCommitDocument<TargetDocType>>> {
    return this._model.findOne<DBCommitDocument<TargetDocType>>(
      { refId },
      {},
      { sort: { _id: -1 }, skip: Math.abs(offset) }
    );
  }
}
