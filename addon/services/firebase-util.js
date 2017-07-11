/** @module emberfire-utils */
import { A } from 'ember-array/utils';
import { assign } from 'ember-platform';
import { typeOf } from 'ember-utils';
import RSVP from 'rsvp';
import Service from 'ember-service';
import service from 'ember-service/inject';
import set from 'ember-metal/set';
import run, { bind } from 'ember-runloop';

/**
 * This is a utility service that works on top of Emberfire.
 *
 * This services allows you to do:
 *
 *   * Multi-path updates
 *   * Storage uploads
 *   * Queries on flattened structure
 *   * Dynamic queries for infinite scroll
 *
 * @class FirebaseUtil
 * @namespace Service
 * @extends Ember.Service
 */
export default Service.extend({
  /**
   * @type Ember.Service
   * @readOnly
   */
  firebase: service(),

  /**
   * @type Ember.Service
   * @readOnly
   */
  firebaseApp: service(),

  /**
   * @type Ember.Service
   * @readOnly
   */
  store: service(),

  /**
   * @type Object
   * @private
   * @default null
   */
  _queryCache: null,

  /**
   * Service hook.
   *
   * - Set _queryCache to an empty object
   */
  init() {
    this._super(...arguments);

    this.set('_queryCache', {});
  },

  /**
   * Uploads a file to Firebase storage
   *
   * @param {string} path Storage path
   * @param {Blob} file File to upload
   * @param {Object} [metadata={}] File metadata
   * @param {function} [onStateChange=() => {}]
   *    Function to call when state changes
   * @return {Promise.<string>} Download URL
   */
  uploadFile(path, file, metadata = {}, onStateChange = () => {}) {
    return new RSVP.Promise((resolve, reject) => {
      let uploadTask = this.get('firebaseApp').storage().ref(path).put(
          file,
          metadata);

      uploadTask.on('state_changed', bind(this, (snapshot) => {
        onStateChange(snapshot);
      }), bind(this, (error) => {
        reject(error);
      }), bind(this, () => {
        resolve(uploadTask.snapshot.downloadURL);
      }));
    });
  },

  /**
   * Delete a file from Firebase storage
   *
   * @param {string} url File HTTPS URL
   * @return {Promise} Resolves when deleted.
   */
  deleteFile(url) {
    return new RSVP.Promise((resolve, reject) => {
      this.get('firebaseApp').storage().refFromURL(url).delete().then(
          bind(this, resolve)).catch(bind(this, (error) => reject(error)));
    });
  },

  /**
   * Writes to firebase natively in fan-out style
   *
   * @param {Object} fanoutObject Fan-out object to write
   * @return {Promise} Resolves when update succeeds
   */
  update(fanoutObject) {
    return new RSVP.Promise((resolve, reject) => {
      this.get('firebase').update(fanoutObject, bind(this, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      }));
    });
  },

  /**
   * @param {string} path
   * @param {Object} [options={}]
   * @return {Promise.<Object>} Resolves to the record if it exists
   */
  queryRecord(path, options = {}) {
    return new RSVP.Promise(bind(this, (resolve, reject) => {
      let ref = this.get('firebase').child(path);

      ref = this._setupQuerySortingAndFiltering(ref, options, true);

      const onSuccess = bind(this, (snapshot) => {
        if (snapshot.exists()) {
          // Will always loop once because of the forced limitTo* 1
          snapshot.forEach((child) => {
            const record = this._serialize(child.key, child.val());

            resolve(record);
          });
        } else {
          reject();
        }
      });

      const onError = bind(this, (error) => {
        reject(error);
      });

      if (options.hasOwnProperty('cacheId')) {
        // TODO
      } else {
        ref.once('value', onSuccess, onError);
      }
    }));
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
   * Finds record from a Firebase path. Any changes made under the
   * Firebase path will be synchronized in realtime.
   *
   * Similar to `store.findRecord()` except that this returns the record
   * in a plain object rather than a `DS.Model`.
   *
   * @param {string} listenerId Firebase listener ID
   * @param {string} path Path of records in Firebase
   * @return {Promise.<Object>} Resolves to the record
   */
  findRecord(listenerId, path) {
    console.warn('DEPRECATION: firebase-util findRecord() will be removed in ' +
        'favor of firebase-util queryRecord()');

    return new RSVP.Promise((resolve, reject) => {
      let query = this.get('_queryCache')[listenerId];

      if (query) {
        run(null, resolve, query.record);
      } else {
        let ref = this.get('firebase').child(path);

        query = { ref: ref, path: path, record: {} };
        this.set(`_queryCache.${listenerId}`, query);

        ref.on('value', bind(this, (snapshot) => {
          if (snapshot.exists()) {
            this._assignObject(
                query.record,
                this._serialize(snapshot.key, snapshot.val()));
            resolve(query.record);
          } else {
            this._nullifyObject(query.record);
            resolve(query.record);
          }
        }), bind(this, (error) => {
          this._nullifyObject(query.record);
          reject(error);
        }));
      }
    });
  },

  /**
   * Finds all data from a Firebase path.
   *
   * Typically, it's bad practice to do a `value` listener on a path
   * that has multiple records due to the potential to download huge
   * amounts of data whenever a property changes. Thus, any changes
   * made under the Firebase path **won't** be synchronized in
   * realtime.
   *
   * Similar to `store.findAll()` except that this returns the records
   * in plain objects rather than a `DS.Model`.
   *
   * @param {string} path Path of records in Firebase
   * @return {Promise.<Array>} Resolves to all records
   */
  findAll(path) {
    return new RSVP.Promise((resolve, reject) => {
      let ref = this.get('firebase').child(path);

      ref.once('value').then(bind(this, (snapshot) => {
        let records = [];

        if (snapshot.exists()) {
          snapshot.forEach((child) => {
            records.push(this._serialize(child.key, child.val()));
          });
        }

        resolve(records);
      })).catch(bind(this, (error) => reject(error)));
    });
  },

  /**
   * Queries data from a Firebase path. Any changes made under the
   * Firebase path will be synchronized in realtime.
   *
   * This has the benefit of providing data for infinite scrolling
   * through the `firebaseUtil.next()` function.
   *
   * @param {string} modelName Model name of the records to query
   * @param {string} listenerId Firebase listener ID
   * @param {string} path Path of records in Firebase
   * @param {Object} [option={}] Query options
   * @return {Array.<Object>} Records
   */
  query(modelName, listenerId, path, option = {}) {
    console.warn('DEPRECATION: You\'re using an old usage of firebase-util ' +
        'query. See the README for the new usage');

    return new RSVP.Promise((resolve, reject) => {
      let query = this.get('_queryCache')[listenerId];

      if (!query) {
        let ref = this.get('firebase').child(path);

        query = {
          ref: ref,
          path: path,
          modelName: modelName,
          willUnshiftRecord: false,
          records: new A(),
        };
        option.orderBy = option.hasOwnProperty('orderBy') ?
            option.orderBy : 'id';
        assign(query, option);
        this.set(`_queryCache.${listenerId}`, query);
        this._setQuerySortingAndFiltering(query);

        // Set an active listener to cache the data for child_added.
        // The child_added listener will turn this off later.
        query.ref.on('value', () => {});
        query.ref.once('value').then(bind(this, (snapshot) => {
          if (snapshot.exists()) {
            let requests = Object.keys(snapshot.val()).map((key) => {
              return this.get('store').findRecord(query.modelName, key);
            });

            RSVP.all(requests).then(bind(this, (records) => {
              records.forEach((record) => query.records.pushObject(record));
              this._setQueryListeners(query);
              resolve(query.records);
            }));
          } else {
            this._setQueryListeners(query);
            resolve(query.records);
          }
        })).catch(bind(this, (error) => reject(error)));
      } else {
        run(null, resolve, query.records);
      }
    });
  },

  /**
   * Load more records to id in _queryCache
   *
   * @param {string} listenerId Listener ID
   * @param {number} numberOfRecords Number of records to add
   * @return {Promise} Resolves when the next set of data has been loaded
   */
  next(listenerId, numberOfRecords) {
    console.warn('DEPRECATION: firebase-util next() will be removed in favor ' +
        'of firebase-flex adapter\'s own implementation');

    return new RSVP.Promise((resolve, reject) => {
      let query = this.get('_queryCache')[listenerId];

      query.ref.off();
      query.ref = this.get('firebase').child(query.path);

      if (query.hasOwnProperty('limitToFirst')) {
        query.limitToFirst += numberOfRecords;
      }

      if (query.hasOwnProperty('limitToLast')) {
        query.limitToLast += numberOfRecords;
        query.willUnshiftRecord = true;
      }

      this._setQuerySortingAndFiltering(query);

      // Set an active listener to cache the data for child_added.
      // The child_added listener will turn this off later.
      query.ref.on('value', () => {});
      query.ref.once('value').then(bind(this, (snapshot) => {
        if (snapshot.exists()) {
          let requests = [];

          Object.keys(snapshot.val()).forEach((key) => {
            if (!query.records.findBy('id', key)) {
              requests.push(this.get('store').findRecord(query.modelName, key));
            }
          });

          RSVP.all(requests).then(bind(this, (records) => {
            records.forEach((record) => {
              if (query.willUnshiftRecord) {
                query.records.unshiftObject(record);
              } else {
                query.records.pushObject(record);
              }
            });

            this._setQueryListeners(query);
            resolve(query.records);
          }));
        } else {
          this._setQueryListeners(query);
          resolve(query.records);
        }
      })).catch(bind(this, (error) => reject(error)));
    });
  },

  /**
   * Checks if record exists in Firebase
   *
   * @param {string} path Firebase path
   * @return {Promise.<boolean>} Resolves to true if record exists.
   *    Otherwise false.
   */
  isRecordExisting(path) {
    return new RSVP.Promise((resolve, reject) => {
      this.get('firebase').child(path).once('value').then(
          bind(this, (snapshot) => {
            resolve(snapshot.exists());
          })).catch(bind(this, (error) => reject(error)));
    });
  },

  /**
   * Generate a Firebase push ID for a path
   *
   * @param {string} path Firebase path
   * @return {string} Push ID
   */
  generateIdForRecord(path) {
    return this.get('firebase').child(path).push().key;
  },

  /**
   * Serializes the record.
   *
   * If `key` has a value of `'foo'` and `value` has a value of `true`,
   * it'll serialize it into this format:
   *
   * ```javascript
   * {
   *   id: 'foo',
   *   value: true
   * }
   * ```
   *
   * If `key` has a value of `'foo'` and `value` has a value of
   * `{name: 'bar'}`, it'll serialize it into this format:
   *
   * ```javascript
   * {
   *   id: 'foo',
   *   name: 'bar'
   * }
   * ```
   *
   * @param {string} key Record key
   * @param {(string|Object)} value Record value
   * @return {Object} Serialized record
   * @private
   */
  _serialize(key, value) {
    let record;

    if (typeOf(value) === 'object') {
      record = value;
      record.id = key;
    } else {
      record = { id: key, value: value };
    }

    return record;
  },

  /**
   * Polyfill workaround for `Object.assign` on an `Ember.Object` object
   * property.
   *
   * @param {Object} objectToUpdate Object to update
   * @param {Object} objectToMerge Object to merge
   * @private
   */
  _assignObject(objectToUpdate, objectToMerge) {
    for (let key in objectToMerge) {
      if (Object.prototype.hasOwnProperty.call(objectToMerge, key)) {
        set(objectToUpdate, key, objectToMerge[key]);
      }
    }
  },

  /**
   * Set all the object key's value to null
   *
   * @param {Object} object Object to clear
   * @private
   */
  _nullifyObject(object) {
    for (let key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        set(object, key, null);
      }
    }
  },

  /**
   * Set the query sorting and filtering
   *
   * @param {Object} query Query object
   * @private
   */
  _setQuerySortingAndFiltering(query) {
    if (query.orderBy === 'id') {
      query.ref = query.ref.orderByKey();
    } else if (query.orderBy === '.value') {
      query.ref = query.ref.orderByValue();
    } else {
      query.ref = query.ref.orderByChild(query.orderBy);
    }

    [ 'startAt', 'endAt', 'equalTo', 'limitToFirst', 'limitToLast' ].forEach(
        (type) => {
          if (query.hasOwnProperty(type)) {
            query.ref = query.ref[type](query[type]);
          }
        });
  },

  /**
   * Set the query listeners
   *
   * @param {Object} query Query object
   * @private
   */
  _setQueryListeners(query) {
    query.ref.on('child_added', bind(this, (snapshot) => {
      // Turn off the active value listener since the child_added is
      // now in responsible for caching the data.
      query.ref.off('value');

      let key = snapshot.key;

      if (!query.records.findBy('id', key)) {
        let recordIndex;
        let tempRecord = { id: key, isLoading: true };

        if (query.willUnshiftRecord) {
          query.records.unshiftObject(tempRecord);
          recordIndex = 1;
        } else {
          query.records.pushObject(tempRecord);
          recordIndex = query.records.get('length');
        }

        this.get('store').findRecord(query.modelName, key).then((record) => {
          query.records.insertAt(recordIndex, record);
          query.records.removeObject(tempRecord);
        });
      }
    }), bind(this, query.records.clear));

    query.ref.on('child_removed', bind(this, (snapshot) => {
      let record = query.records.findBy('id', snapshot.key);

      if (record) {
        query.records.removeObject(record);
      }
    }), bind(this, query.records.clear));
  },
});
