/** @module emberfire-utils */
import { scheduleOnce } from 'ember-runloop';
import Component from 'ember-component';
import inject from 'ember-service/inject';

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
  firebaseUi: inject(),

  /**
   * @type {string}
   * @readonly
   */
  elementId: 'firebaseui-auth-container',

  /**
   * Component hook.
   *
   * - Renders the FirebaseUI auth widget
   */
  didInsertElement() {
    this._super(...arguments);

    scheduleOnce('afterRender', () => {
      this.get('firebaseUi').startAuthUi(this.getAttr('uiConfig'));
    });
  },

  /**
   * Component hook.
   *
   * - Reset the FirebaseUI auth widget
   */
  willDestroyElement() {
    this._super(...arguments);

    this.get('firebaseUi').resetAuthUi();
  },
});
