/**
 *
 * @typedef {import('@changesets/types').Changeset} Changeset
 * @typedef {import('@changesets/types').VersionType} VersionType
 * @typedef {import('@changesets/types').ReleasePlan} ReleasePlan
 */
module.exports = {
  /**
   *
   * @param {Changeset} changeset
   * @returns {Promise<string>}
   */
  getAddMessage: async changeset => {
    /** @type {VersionType[]} */
    const RANK_MAP = ['none', 'patch', 'minor', 'major'];
    const ranking = RANK_MAP[Math.max(
      0,
      ...changeset.releases.map(r => RANK_MAP.indexOf(r.type))
    )];
    return `${ranking}(changeset): ${changeset.summary}`;
  },

  /**
   *
   * @param {ReleasePlan} releasePlan
   * @returns {Promise<void>}
   */
  getVersionMessage: async releasePlan => {
    return `Release ${releasePlan.releases[0].newVersion}`;
  }
};
