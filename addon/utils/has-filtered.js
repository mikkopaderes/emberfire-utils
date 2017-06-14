/** @module emberfire-utils */
import { assign } from 'ember-platform';
import Ember from 'ember';
import computed from 'ember-computed';

const { ArrayProxy, PromiseProxyMixin } = Ember;

/**
 * @param {string} modelName
 * @param {Object} [rawQuery={}]
 * @return {Utility.PromiseArray} Promise array resolving to records
 */
export default function hasFiltered(modelName, rawQuery = {}) {
  return computed({
    get() {
      const PromiseArray = ArrayProxy.extend(PromiseProxyMixin);
      const query = assign({}, rawQuery);

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
