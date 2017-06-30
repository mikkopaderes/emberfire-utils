/** @module emberfire-utils */
import Ember from 'ember';
import computed from 'ember-computed';

const { ArrayProxy, PromiseProxyMixin } = Ember;
let PromiseArray = ArrayProxy.extend(PromiseProxyMixin);

/**
 * Get the reference for the specified `hasLimited` relationship.
 *
 * The difference with native `hasMany` is that this supports
 * queries with infinite records through `firebaseUtil.next()`.
 * This will also serialize the records into a `DS.Model`.
 *
 * @param {string} modelName Model name of the records to query
 * @param {string} listenerId Firebase listener ID
 * @param {string} path Path of records in Firebase
 * @param {Object} [options] Query options
 * @return {Utility.PromiseArray} Promise array resolving to records
 */
export default function hasLimited(modelName, listenerId, path, options) {
  return computed({
    get() {
      console.warn('DEPRECATION: hasLimited() will be removed in favor ' +
          'of hasFiltered()');

      let newListenerId = listenerId.replace('$id', this.get('id'));
      let newPath = path.replace('$id', this.get('id'));

      return PromiseArray.create({
        promise: this.get('firebaseUtil').query(
            modelName,
            newListenerId,
            newPath,
            options),
      });
    },
  }).readOnly();
}
