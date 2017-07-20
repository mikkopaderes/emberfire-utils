/** @module emberfire-utils */
import { assign } from 'ember-platform';
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
    const changedAttributes = assign({}, snapshot.changedAttributes());

    snapshot.eachAttribute((key, attribute) => {
      if (changedAttributes.hasOwnProperty(key)) {
        fanout[`${path}/${key}`] = snapshot.attr(key);
      }
    });

    // TODO: Implement updating changed relationships once Ember Data
    // supports tracking it. See directions of
    // https://github.com/emberjs/data/pull/3698
    // snapshot.eachRelationship((key, relationship) => {
    //   if (relationship.kind === 'belongsTo') {
    //     fanout[`${path}/${key}`] = snapshot.belongsTo(key, {
    //       id: true,
    //     });
    //   } else if (relationship.kind === 'hasMany') {
    //     const unformattedHasManyKey = `${modelName} ${key}`;
    //     const camelizedHasManyKey = camelize(unformattedHasManyKey);
    //     const pluralizedHasManyKey = pluralize(camelizedHasManyKey);

    //     snapshot.hasMany(key, { ids: true }).forEach((id) => {
    //       const path = `/${pluralizedHasManyKey}/${snapshotId}/${id}`;

    //       fanout[path] = true;
    //     });
    //   }
    // });

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
