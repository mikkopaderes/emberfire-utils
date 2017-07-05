/** @module emberfire-utils */
import { pluralize } from 'ember-inflector';
import { assign } from 'ember-platform';
import { bind } from 'ember-runloop';
import Adapter from 'ember-data/adapter';
import RSVP from 'rsvp';
import computed from 'ember-computed';
import getOwner from 'ember-owner/get';
import inject from 'ember-service/inject';

/**
 * @class FirebaseFlex
 * @namespace Adapter
 * @extends DS.Adapter
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
   * @type {Object}
   * @default
   */
  trackedQueries: {},

  /**
   * @type {Ember.Service}
   * @default
   * @readonly
   */
  fastboot: computed(function() {
    return getOwner(this).lookup('service:fastboot');
  }),

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
      const path = snapshot.adapterOptions && snapshot.adapterOptions.path ?
          snapshot.adapterOptions.path : null;

      this._setupValueListener(store, type.modelName, snapshot.id, path);
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
      const fanout = assign({}, serializedSnapshot, serializedInclude);

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
   * @param {DS.Snapshot} [snapshot={}]
   * @return {Promise} Resolves with the fetched record
   */
  findRecord(store, type, id, snapshot = {}) {
    return new RSVP.Promise(bind(this, (resolve, reject) => {
      const path = snapshot.adapterOptions && snapshot.adapterOptions.path ?
          snapshot.adapterOptions.path : null;
      const modelName = type.modelName;
      const onValue = bind(this, (snapshot) => {
        if (snapshot.exists()) {
          this._setupValueListener(store, modelName, id, path);
          ref.off('value', onValue);
          resolve(this._getGetSnapshotWithId(snapshot));
        } else {
          reject();
        }
      });

      let ref = this._getFirebaseReference(modelName, id, path);

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
        const findRecordPromises = [];

        if (snapshot.exists()) {
          snapshot.forEach((child) => {
            findRecordPromises.push(this.findRecord(store, type, child.key));
          });

          RSVP.all(findRecordPromises).then(bind(this, (records) => {
            this._setupListListener(store, modelName);
            ref.off('value');
            resolve(records);
          })).catch(bind(this, (error) => {
            reject(error);
          }));
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
      fanout = assign({}, fanout, serializedInclude);

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
   * @param {Object} [query={}]
   * @return {Promise} Resolves with the queried record
   */
  queryRecord(store, type, query = {}) {
    return new RSVP.Promise(bind(this, (resolve, reject) => {
      const path = query.path;
      const onValue = bind(this, (snapshot) => {
        if (snapshot.exists()) {
          // Will always loop once because of the forced limitTo* 1
          snapshot.forEach((child) => {
            const snapshot = {};

            if (path && typeof child.val() === 'object') {
              snapshot.adapterOptions = { path: path };
            }

            this.findRecord(store, type, child.key, snapshot).then((record) => {
              ref.off('value', onValue);
              resolve(record);
            }).catch((error) => {
              reject(error);
            });
          });
        } else {
          reject();
        }
      });

      let ref = this._getFirebaseReference(type.modelName, undefined, path);

      ref = this._setupQuerySortingAndFiltering(ref, query, true);

      ref.on('value', onValue, bind(this, (error) => {
        reject(error);
      }));
    }));
  },

  /**
   * @param {DS.Store} store
   * @param {DS.Model} type
   * @param {Object} [query={}]
   * @param {DS.AdapterPopulatedRecordArray} recordArray
   * @return {Promise} Resolves with the queried record
   */
  query(store, type, query = {}, recordArray) {
    return new RSVP.Promise(bind(this, (resolve, reject) => {
      const path = query.path;
      const hasCacheId = query.hasOwnProperty('cacheId');
      const modelName = type.modelName;
      const onValue = bind(this, (snapshot) => {
        const findRecordPromises = [];

        if (snapshot.exists()) {
          snapshot.forEach((child) => {
            const snapshot = {};

            if (path && typeof child.val() === 'object') {
              snapshot.adapterOptions = { path: path };
            }

            findRecordPromises.push(this.findRecord(
                store, type, child.key, snapshot));
          });
        }

        RSVP.all(findRecordPromises).then(bind(this, (records) => {
          if (hasCacheId) {
            this._setupQueryListListener(store, modelName, recordArray, ref);
            this._trackQuery(query.cacheId, recordArray);
          }

          ref.off('value', onValue);
          resolve(records);
        })).catch(bind(this, (error) => {
          reject(error);
        }));
      });

      let ref = this._getFirebaseReference(modelName, undefined, path);

      ref = this._setupQuerySortingAndFiltering(ref, query);

      ref.on('value', onValue, bind(this, (error) => {
        reject(error);
      }));
    }));
  },

  /**
   * @param {DS.Snapshot} snapshot
   * @return {Object} Serialized include
   * @private
   */
  _serializeInclude(snapshot) {
    const newInclude = {};

    if (snapshot.hasOwnProperty('adapterOptions')) {
      const adapterOptions = snapshot.adapterOptions;

      if (adapterOptions && adapterOptions.hasOwnProperty('include')) {
        const include = adapterOptions.include;

        for (let key in include) {
          if (Object.prototype.hasOwnProperty.call(include, key)) {
            const newKey = key.replace('$id', snapshot.id);

            newInclude[newKey] = include[key];
          }
        }
      }
    }

    return newInclude;
  },

  /**
   * @param {DS.Store} store
   * @param {string} modelName
   * @param {string} id
   * @param {string} path
   * @private
   */
  _setupValueListener(store, modelName, id, path) {
    const fastboot = this.get('fastboot');

    if (!fastboot || !fastboot.get('isFastBoot')) {
      const key = path ? `${path}/${id}` : `${pluralize(modelName)}/${id}`;

      if (!this._isListenerTracked(key, 'value')) {
        this._trackListener(key, 'value');

        const ref = this._getFirebaseReference(modelName, id, path);

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
    }
  },

  /**
   * @param {DS.Store} store
   * @param {string} modelName
   * @private
   */
  _setupListListener(store, modelName) {
    const fastboot = this.get('fastboot');

    if (!fastboot || !fastboot.get('isFastBoot')) {
      const path = `${pluralize(modelName)}`;

      if (!this._isListenerTracked(path, 'child_added')) {
        this._trackListener(path, 'child_added');
        this._getFirebaseReference(modelName).on('child_added', (snapshot) => {
          this._setupValueListener(store, modelName, snapshot.key);
        });
      }
    }
  },

  /**
   * @param {DS.Store} store
   * @param {string} modelName
   * @param {DS.AdapterPopulatedRecordArray} recordArray
   * @param {firebase.database.DataSnapshot} ref
   * @private
   */
  _setupQueryListListener(store, modelName, recordArray, ref) {
    const fastboot = this.get('fastboot');

    if (!fastboot || !fastboot.get('isFastBoot')) {
      const onChildAdded = bind(this, (snapshot) => {
        store.findRecord(modelName, snapshot.key).then((record) => {
          // We're using a private API here and will likely break
          // without warning. We need to make sure that our acceptance
          // tests will capture this even if indirectly.
          recordArray.get('content').addObject(record._internalModel);
        });
      });

      ref.on('child_added', onChildAdded);

      const onChildRemoved = bind(this, (snapshot) => {
        const record = recordArray.get('content').findBy('id', snapshot.key);

        if (record) {
          recordArray.get('content').removeObject(record);
        }
      });

      ref.on('child_removed', onChildRemoved);

      this._setupRecordExtensions(
          recordArray, ref, onChildAdded, onChildRemoved);
    }
  },

  /**
   * @param {DS.AdapterPopulatedRecordArray} recordArray
   * @param {firebase.database.DataSnapshot} ref
   * @param {function} onChildAdded
   * @param {function} onChildRemoved
   * @private
   */
  _setupRecordExtensions(recordArray, ref, onChildAdded, onChildRemoved) {
    recordArray.set('firebase', {
      next(numberOfRecords) {
        ref.off('child_added', onChildAdded);
        ref.off('child_removed', onChildRemoved);

        const query = recordArray.get('query');

        if (query.hasOwnProperty('limitToFirst')) {
          query.limitToFirst += numberOfRecords;
        }

        if (query.hasOwnProperty('limitToLast')) {
          query.limitToLast += numberOfRecords;
        }

        return recordArray.update();
      },

      off() {
        ref.off('child_added', onChildAdded);
        ref.off('child_removed', onChildRemoved);
      },
    });
  },

  /**
   * @param {firebase.database.DataSnapshot} ref
   * @param {Object} query
   * @param {boolean} isForcingLimitToOne
   * @return {firebase.database.DataSnapshot} Reference with sort/filters
   * @private
   */
  _setupQuerySortingAndFiltering(ref, query, isForcingLimitToOne) {
    if (!query.hasOwnProperty('orderBy')) {
      query.orderBy = 'id';
    }

    if (query.orderBy === 'id') {
      ref = ref.orderByKey();
    } else if (query.orderBy === '.value') {
      ref = ref.orderByValue();
    } else {
      ref = ref.orderByChild(query.orderBy);
    }

    if (isForcingLimitToOne) {
      if (query.hasOwnProperty('limitToFirst') ||
          query.hasOwnProperty('limitToLast')) {
        if (query.hasOwnProperty('limitToFirst')) {
          query.limitToFirst = 1;
        } else {
          query.limitToLast = 1;
        }
      } else {
        query.limitToFirst = 1;
      }
    }

    [
      'startAt',
      'endAt',
      'equalTo',
      'limitToFirst',
      'limitToLast',
    ].forEach((type) => {
      if (query.hasOwnProperty(type)) {
        ref = ref[type](query[type]);
      }
    });

    return ref;
  },

  /**
   * @param {firebase.database.DataSnapshot} snapshot
   * @return {Object} Snapshot with ID
   * @private
   */
  _getGetSnapshotWithId(snapshot) {
    return assign({}, { id: snapshot.key }, snapshot.val());
  },

  /**
   * @param {string} modelName
   * @param {string} [id='']
   * @param {string} [path]
   * @return {firebase.database.DataSnapshot} Firebase reference
   * @private
   */
  _getFirebaseReference(modelName, id = '', path) {
    const firebase = this.get('firebase');

    if (path) {
      return firebase.child(`${path}/${id}`);
    } else {
      return firebase.child(`${pluralize(modelName)}/${id}`);
    }
  },

  /**
   * @param {DS.Store} store
   * @param {string} modelName
   * @param {string} id
   * @private
   */
  _unloadRecord(store, modelName, id) {
    const record = store.peekRecord(modelName, id);

    if (record && !record.get('isSaving')) {
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
    const tempTrackedListeners = assign({}, trackedListeners);

    if (!tempTrackedListeners.hasOwnProperty(key)) {
      tempTrackedListeners[key] = {};
    }

    tempTrackedListeners[key][type] = true;

    this.set('trackedListeners', assign(
        {}, trackedListeners, tempTrackedListeners));
  },

  /**
   * @param {string} cacheId
   * @param {DS.AdapterPopulatedRecordArray} recordArray
   * @private
   */
  _trackQuery(cacheId, recordArray) {
    const fastboot = this.get('fastboot');

    if (!fastboot || !fastboot.get('isFastBoot')) {
      const trackedQueries = this.get('trackedQueries');
      const trackedQueryCache = trackedQueries[cacheId];

      if (trackedQueryCache) {
        trackedQueryCache.get('firebase').off();
      }

      const trackedQuery = {};

      trackedQuery[cacheId] = recordArray;

      this.set('trackedQueries', assign({}, trackedQueries, trackedQuery));
    }
  },
});
