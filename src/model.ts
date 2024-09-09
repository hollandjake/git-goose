import { GitGlobalConfig, type ModelOptions } from './config';
import { GitError } from './errors';
import { DBCommitSchema, type DBCommitModel } from './schemas';

export function GitModel<TargetDocType>(conf: Partial<ModelOptions> = {}): DBCommitModel<TargetDocType> {
  const gitGlobalConfig = GitGlobalConfig;
  const connection = conf.connection ?? gitGlobalConfig.connection;
  if (!connection) {
    throw new GitError('No connection provided, please define one in the options or in the global GitGlobalConfig');
  }

  const collectionName = conf.collectionName ?? gitGlobalConfig.collectionName;
  if (!collectionName) {
    throw new GitError('No collectionName provided, please define one in the options or in the global GitGlobalConfig');
  }

  const model = connection.models[collectionName] ?? connection.model(collectionName, DBCommitSchema, collectionName);

  if (model.schema.obj !== DBCommitSchema.obj) {
    throw new GitError(`Collection '${collectionName}' is already in use by another model`);
  }

  return model as unknown as DBCommitModel<TargetDocType>;
}
