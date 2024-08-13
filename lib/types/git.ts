import { Types } from 'mongoose';
import type { Commit } from './commit';

/**
 * A tracked reference objects id, normally this will be an [ObjectId]{@link mongoose.Types.ObjectId},
 * in Git terms this represents the branch
 */
export type RefId = unknown;

/** The ID of the Commit, Note here it is not a SHA1 hash and instead is a BSON ObjectId */
export type CommitHash = Types.ObjectId | string;

type GitOffsetSymbol = '~' | '^';
type GitRootSymbol = 'HEAD' | '@';
export type CommitOffset = `${GitRootSymbol}${GitOffsetSymbol}` | `${GitRootSymbol}${GitOffsetSymbol}${number}`;

/** String representation of a Date */
export type DateString = string;

/** Identifier for a commit */
export type CommitRef = CommitHash | DateString | Date | number | CommitOffset;

export type Diff = Array<Commit>;
