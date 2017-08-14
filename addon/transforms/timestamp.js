/** @module emberfire-utils */
import Transform from 'ember-data/transform';

import firebase from 'firebase';

/**
 * @class Timestamp
 * @namespace Transform
 * @extends DS.Transform
 */
export default Transform.extend({
  /**
   * @param {number} serialized
   * @return {date} Deserialized object
   */
  deserialize(serialized) {
    return new Date(serialized);
  },

  /**
   * @return {Object} Firebase server timestamp
   */
  serialize() {
    return firebase.database.ServerValue.TIMESTAMP;
  },
});
