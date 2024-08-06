/**
 *
 * @typedef {import('@changesets/types').Changeset} Changeset
 * @typedef {import('@changesets/types').VersionType} VersionType
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
    return `changeset(${ranking}): ${changeset.summary}`;
  }
};
