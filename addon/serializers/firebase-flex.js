/** @module emberfire-utils */
import { pluralize } from 'ember-inflector';
import { assign } from 'ember-platform';
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
    const modelName = snapshot.modelName;
    const snapshotId = snapshot.id;
    const snapshotPath = `/${pluralize(modelName)}/${snapshotId}`;
    const changedAttributes = assign({}, snapshot.changedAttributes());

    snapshot.eachAttribute((key, attribute) => {
      if (changedAttributes.hasOwnProperty(key)) {
        fanout[`${snapshotPath}/${key}`] = snapshot.attr(key);
      }
    });

    // TODO: Implement updating changed relationships once Ember Data
    // supports tracking it.
    // snapshot.eachRelationship((key, relationship) => {
    //   if (relationship.kind === 'belongsTo') {
    //     fanout[`${snapshotPath}/${key}`] = snapshot.belongsTo(key, {
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
});
