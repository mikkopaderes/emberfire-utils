/** @module emberfire-utils */
import Component from 'ember-component';
import inject from 'ember-service/inject';

import FirebaseUi from 'firebaseui';

import layout from '../templates/components/firebase-ui-auth';

/**
 * `<firebase-ui-auth>`
 *
 * API Reference:
 *   * `@uiConfig` - Object
 *
 * @class FirebaseUiAuth
 * @namespace Component
 * @extends Ember.Component
 */
export default Component.extend({
  layout,

  /**
   * @type Ember.Service
   * @readOnly
   */
  firebaseApp: inject(),

  /**
   * @type {string}
   * @readonly
   */
  elementId: 'firebaseui-auth-container',

  /**
   * @type {FirebaseUi}
   * @default
   */
  ui: null,

  /**
   * Component hook.
   *
   * - Renders the FirebaseUI auth widget
   */
  init() {
    this._super(...arguments);

    let auth = this.get('firebaseApp').auth();
    let ui = new FirebaseUi.auth.AuthUI(auth);

    ui.start('#firebaseui-auth-container', this.getAttr('uiConfig'));
    this.set('ui', ui);
  },

  /**
   * Component hook.
   *
   * - Dispose the auth widget
   */
  willDestroyElement() {
    this._super(...arguments);

    this.get('ui').reset();
  },
});
