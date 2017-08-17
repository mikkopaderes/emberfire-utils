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
        if (query.cacheId.includes('$id')) {
          console.warn('DEPRECATION: hasFiltered() cacheId will now use :id ' +
              'instead of $id');

          query.cacheId = query.cacheId.replace('$id', this.get('id'));
        }

        query.cacheId = query.cacheId.replace(':id', this.get('id'));
      }

      if (query.hasOwnProperty('path')) {
        if (query.path.includes('$id')) {
          console.warn('DEPRECATION: hasFiltered() path will now use :id ' +
              'instead of $id');

          query.path = query.path.replace('$id', this.get('id'));
        }

        query.path = query.path.replace(':id', this.get('id'));

        const modelName = this.get('constructor.modelName');
        const adapter = this.get('store').adapterFor(modelName);
        const innerReferencePathName = adapter.get('innerReferencePathName');

        if (query.path.includes('$innerReferencePath')) {
          console.warn('DEPRECATION: hasFiltered() path will now use ' +
              ':innerReferencePath instead of $innerReferencePath');

          query.path = query.path.replace(
              '$innerReferencePath', this.get(innerReferencePathName));
        }

        query.path = query.path.replace(
            ':innerReferencePath', this.get(innerReferencePathName));
      }

      return PromiseArray.create({
        promise: this.get('store').query(modelName, query),
      });
    },
  }).readOnly();
}
