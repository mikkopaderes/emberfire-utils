/**
 * @module emberfire-utils
 */

/**
 * Firebase util initializer
 *
 * @method initializer
 * @param {Object} application Application instance
 * @for Initializers
 */
export function initialize(application) {
  application.inject('route', 'firebaseUtil', 'service:firebase-util');
  application.inject('controller', 'firebaseUtil', 'service:firebase-util');
  application.inject('model', 'firebaseUtil', 'service:firebase-util');
}

export default {
  name: 'firebase-util',
  initialize
};
