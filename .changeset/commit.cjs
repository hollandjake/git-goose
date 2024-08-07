/**
 *
 * @typedef {import('@changesets/types').Changeset} Changeset
 * @typedef {import('@changesets/types').ReleasePlan} ReleasePlan
 */
module.exports = {
  /**
   *
   * @param {Changeset} changeset
   * @returns {Promise<string>}
   */
  getAddMessage: async changeset => {
    return `docs(changeset): ${changeset.summary}`;
  },

  // /**
  //  *
  //  * @param {ReleasePlan} releasePlan
  //  * @returns {Promise<void>}
  //  */
  // getVersionMessage: async releasePlan => {
  //   return `Release ${releasePlan.releases[0].newVersion}`;
  // }
};
