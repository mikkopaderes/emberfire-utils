/** @module emberfire-utils */

/**
 * Firebase util initializer
 *
 * @param {Object} application
 */
export function initialize(application) {
  application.inject('route', 'firebaseUtil', 'service:firebase-util');
  application.inject('controller', 'firebaseUtil', 'service:firebase-util');
  application.inject('model', 'firebaseUtil', 'service:firebase-util');
}

export default {
  name: 'firebase-util',
  initialize,
};
