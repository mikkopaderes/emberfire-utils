/** @module emberfire-utils */
import Service from 'ember-service';
import inject from 'ember-service/inject';

import FirebaseUi from 'firebaseui';
import firebase from 'firebase';

/**
 * This is a service for FirebaseUI
 *
 * @class FirebaseUi
 * @namespace Service
 * @extends Ember.Service
 */
export default Service.extend({
  /**
   * @type Ember.Service
   * @readonly
   */
  firebaseApp: inject(),

  /**
   * @type {FirebaseUi}
   * @readonly
   */
  ui: null,

  /**
   * Service hook
   *
   * - Sets the global firebase variable
   */
  init() {
    this._super(...arguments);

    // Workaround for when the firebase asset is an AMD module
    window.firebase = firebase;
  },

  /**
   * Starts the FirebaseUI Auth
   *
   * @param {Object} uiConfig
   */
  startAuthUi(uiConfig) {
    let auth = this.get('firebaseApp').auth();
    let ui = this.get('ui');

    if (!ui) {
      ui = new FirebaseUi.auth.AuthUI(auth);
    }

    ui.start('#firebaseui-auth-container', uiConfig);
    this.set('ui', ui);
  },

  /**
   * Resets the FirebaseUI Auth
   */
  resetAuthUi() {
    this.get('ui').reset();
  },
});
