/** @module emberfire-utils */
import { camelize } from 'ember-string';
import { pluralize } from 'ember-inflector';
import EmberFireSerializer from 'emberfire/serializers/firebase';

/**
 * @class FirebaseFlex
 * @namespace Serializer
 * @extends DS.JSONSerializer
 */
export default EmberFireSerializer.extend({
  /**
   * @param {DS.Snapshot} snapshot
   * @return {Object} Fanout object for Firebase
   */
  serialize(snapshot) {
    const fanout = {};
    const path = this._getPath(snapshot);

    for (const key in snapshot.changedAttributes()) {
      if (key !== '_innerReferencePath') {
        fanout[`${path}/${key}`] = snapshot.attr(key);
      }
    }

    return fanout;
  },

  /**
   * @param {DS.Snapshot} snapshot
   * @return {string} Firebase path
   * @private
   */
  _getPath(snapshot) {
    if (snapshot.adapterOptions &&
        snapshot.adapterOptions.hasOwnProperty('path')) {
      let pathPrefix = snapshot.adapterOptions.path;

      if (pathPrefix) {
        if (!pathPrefix.startsWith('/')) {
          pathPrefix = `/${pathPrefix}`;
        }

        return `${pathPrefix}/${snapshot.id}`;
      }
    }

    return `/${camelize(pluralize(snapshot.modelName))}/${snapshot.id}`;
  },
});
