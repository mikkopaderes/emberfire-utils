import { pluralize } from 'ember-inflector';
import { bind } from 'ember-runloop';
import Adapter from 'ember-data/adapter';
import RSVP from 'rsvp';
import inject from 'ember-service/inject';

/**
 * This is an adapter for Firebase that's designed to make use of
 * its power features.
 */
export default Adapter.extend({
  defaultSerializer: '-firebase-flex',

  /**
   * @type {Ember.Service}
   * @default
   * @readonly
   */
  firebase: inject(),

  /**
   * @type {Object}
   * @default
   */
  trackedListeners: {},

  /**
   * @return {string} Push ID
   */
  generateIdForRecord() {
    return this.get('firebase').push().key;
  },

  /**
   * @param {DS.Store} store
   * @param {DS.Model} type
   * @param {DS.Snapshot} snapshot
   * @return {Promise} Resolves when create record succeeds
   */
  createRecord(store, type, snapshot) {
    return this.updateRecord(store, type, snapshot).then(() => {
      this._setupValueListener(store, type.modelName, snapshot.id);
    });
  },

  /**
   * @param {DS.Store} store
   * @param {DS.Model} type
   * @param {DS.Snapshot} snapshot
   * @return {Promise} Resolves when update record succeeds
   */
  updateRecord(store, type, snapshot) {
    return new RSVP.Promise(bind(this, (resolve, reject) => {
      const serializedSnapshot = this.serialize(snapshot);
      const serializedInclude = this._serializeInclude(snapshot);
      const fanout = Object.assign({}, serializedSnapshot, serializedInclude);

      this.get('firebase').update(fanout, bind(this, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      }));
    }));
  },

  /**
   * @param {DS.Store} store
   * @param {DS.Model} type
   * @param {string} id
   * @return {Promise} Resolves with the fetched record
   */
  findRecord(store, type, id) {
    return new RSVP.Promise(bind(this, (resolve, reject) => {
      const modelName = type.modelName;
      const ref = this._getFirebaseReference(modelName, id);
      const onValue = bind(this, (snapshot) => {
        if (snapshot.exists()) {
          resolve(this._getGetSnapshotWithId(snapshot));

          this._setupValueListener(store, modelName, id);
          ref.off('value', onValue);
        } else {
          reject();
        }
      });

      ref.on('value', onValue);
    }));
  },

  /**
   * @param {DS.Store} store
   * @param {DS.Model} type
   * @return {Promise} Resolves with the fetched records
   */
  findAll(store, type) {
    return new RSVP.Promise(bind(this, (resolve, reject) => {
      const modelName = type.modelName;
      const ref = this._getFirebaseReference(modelName);

      ref.on('value', bind(this, (snapshot) => {
        if (snapshot.exists()) {
          const records = [];

          snapshot.forEach((child) => {
            this._setupValueListener(store, modelName, child.key);
            records.push(this._getGetSnapshotWithId(child));
          });

          resolve(records);

          this._setupListListener(store, modelName);
          ref.off('value');
        } else {
          reject();
        }
      }), bind(this, (error) => {
        reject(error);
      }));
    }));
  },

  /**
   * @param {DS.Store} store
   * @param {DS.Model} type
   * @param {DS.Snapshot} snapshot
   * @return {Promise} Resolves once the record has been deleted
   */
  deleteRecord(store, type, snapshot) {
    return new RSVP.Promise(bind(this, (resolve, reject) => {
      const modelName = type.modelName;
      const id = snapshot.id;
      const path = `/${pluralize(modelName)}/${id}`;
      const serializedInclude = this._serializeInclude(snapshot);
      let fanout = {};

      fanout[path] = null;
      fanout = Object.assign({}, fanout, serializedInclude);

      this.get('firebase').update(fanout, bind(this, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      }));
    }));
  },

  /**
   * @param {DS.Snapshot} snapshot
   * @return {Object} Serialized include
   * @private
   */
  _serializeInclude(snapshot) {
    let newInclude = {};

    if (snapshot.hasOwnProperty('firebase')) {
      const include = snapshot.firebase.include;

      for (let key in include) {
        if (Object.prototype.hasOwnProperty.call(include, key)) {
          const newKey = key.replace('$id', snapshot.id);

          newInclude[newKey] = include[key];
        }
      }
    }

    return newInclude;
  },

  /**
   * @param {DS.Store} store
   * @param {string} modelName
   * @param {string} id
   * @private
   */
  _setupValueListener(store, modelName, id) {
    const path = `/${pluralize(modelName)}/${id}`;

    if (!this._isListenerTracked(path, 'value')) {
      this._trackListener(path, 'value');

      const ref = this._getFirebaseReference(modelName, id);

      ref.on('value', bind(this, (snapshot) => {
        if (snapshot.exists()) {
          const snapshotWithId = this._getGetSnapshotWithId(snapshot);
          const normalizedRecord = store.normalize(modelName, snapshotWithId);

          store.push(normalizedRecord);
        } else {
          this._unloadRecord(store, modelName, id);
        }
      }), bind(this, (error) => {
        this._unloadRecord(store, modelName, id);
      }));
    }
  },

  /**
   * @param {DS.Store} store
   * @param {string} modelName
   * @private
   */
  _setupListListener(store, modelName) {
    const path = `/${pluralize(modelName)}`;

    if (!this._isListenerTracked(path, 'child_added')) {
      this._trackListener(path, 'child_added');
      this._getFirebaseReference(modelName).on('child_added', (snapshot) => {
        this._setupValueListener(store, modelName, snapshot.key);
      });
    }
  },

  /**
   * @param {firebase.database.DataSnapshot} snapshot
   * @return {Object} Snapshot with ID
   * @private
   */
  _getGetSnapshotWithId(snapshot) {
    return Object.assign({}, { id: snapshot.key }, snapshot.val());
  },

  /**
   * @param {string} modelName
   * @param {string} [id='']
   * @return {firebase.database.DataSnapshot} Firebase reference
   * @private
   */
  _getFirebaseReference(modelName, id = '') {
    const path = `/${pluralize(modelName)}/${id}`;

    return this.get('firebase').child(path);
  },

  /**
   * @param {DS.Store} store
   * @param {string} modelName
   * @param {string} id
   * @private
   */
  _unloadRecord(store, modelName, id) {
    const record = store.peekRecord(modelName, id);

    if (record && !record.isSaving) {
      store.unloadRecord(record);
    }
  },

  /**
   * @param {string} key trackedListeners key
   * @param {string} type Type of listener (value, child_added, etc.)
   * @return {boolean} True if already tracked. Otherwise, false.
   * @private
   */
  _isListenerTracked(key, type) {
    const trackedListeners = this.get('trackedListeners');

    return trackedListeners.hasOwnProperty(key) && trackedListeners[key][type];
  },

  /**
   * @param {string} key trackedListeners key
   * @param {string} type Type of listener (value, child_added, etc.)
   * @private
   */
  _trackListener(key, type) {
    const trackedListeners = this.get('trackedListeners');
    const tempTrackedListeners = Object.assign({}, trackedListeners);

    if (!tempTrackedListeners.hasOwnProperty(key)) {
      tempTrackedListeners[key] = {};
    }

    tempTrackedListeners[key][type] = true;

    this.set('trackedListeners', Object.assign(
        {}, trackedListeners, tempTrackedListeners));
  },
});
