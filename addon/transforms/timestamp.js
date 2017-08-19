/** @module emberfire-utils */
import Transform from 'ember-data/transforms/date';

import firebase from 'firebase';

/**
 * @class Timestamp
 * @namespace Transform
 * @extends DS.Transform
 */
export default Transform.extend({
  /**
   * @return {Object} Firebase server timestamp
   */
  serialize() {
    return firebase.database.ServerValue.TIMESTAMP;
  },
});
