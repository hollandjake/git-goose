import { Model } from 'mongoose';
import { ContextualGitConfig } from '../config';
import { PatcherName, RefId } from '../types';
import { GitWithContext } from './context';

/**
 * Git manager with the knowledge of its target referenceId, enabling contextually aware operations
 *
 * @template TargetDocType - The type of the document to be generated
 * @template TPatcherName - The inferred name of the patcher to use (used for type hinting patches)
 */
export class GitFromRefId<TargetDocType, TPatcherName extends PatcherName> extends GitWithContext<
  TargetDocType,
  TPatcherName
> {
  private readonly _refId: RefId;

  constructor(referenceModel: Model<TargetDocType>, refId: RefId, conf?: Partial<ContextualGitConfig<TPatcherName>>) {
    super(referenceModel, conf);

    this._refId = refId;
  }

  protected get refId() {
    return this._refId;
  }
}
