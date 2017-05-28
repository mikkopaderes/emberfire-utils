/** @module emberfire-utils */
import Ember from 'ember';
import computed from 'ember-computed';

const { ArrayProxy, PromiseProxyMixin } = Ember;
let PromiseArray = ArrayProxy.extend(PromiseProxyMixin);

/**
 * @param {string} modelName
 * @param {Object} [query={}]
 * @return {Utility.PromiseArray} Promise array resolving to records
 */
export default function hasFiltered(modelName, query = {}) {
  return computed({
    get() {
      if (query.hasOwnProperty('cacheId')) {
        query.cacheId = query.cacheId.replace('$id', this.get('id'));
      }

      if (query.hasOwnProperty('path')) {
        query.path = query.path.replace('$id', this.get('id'));
      }

      return PromiseArray.create({
        promise: this.get('store').query(modelName, query),
      });
    },
  }).readOnly();
}
