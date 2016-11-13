/**
 * @module cenchat-web
 */
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
 * @method hasLimited
 * @param {String} modelName Model name of the records to query
 * @param {String} listenerId Firebase listener ID
 * @param {String} path Path of records in Firebase
 * @param {Object} [options] Query options
 * @return {Utility.PromiseArray} Promise array resolving to records
 */
export default function hasLimited(modelName, listenerId, path, option) {
  return computed({
    get() {
      let newListenerId = listenerId.replace('$id', this.get('id'));
      let newPath = path.replace('$id', this.get('id'));

      return PromiseArray.create({
        promise: this.get('firebaseUtil').query(
            modelName, newListenerId, newPath, option)
      });
    }
  }).readOnly();
}
