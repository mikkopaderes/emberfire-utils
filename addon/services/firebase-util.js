/**
 * @module cenchat-web
 */
import { A } from 'ember-array/utils';
import { assign } from 'ember-platform';
import { typeOf } from 'ember-utils';
import RSVP from 'rsvp';
import Service from 'ember-service';
import service from 'ember-service/inject';
import run from 'ember-runloop';

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
   * Firebase service
   *
   * @property firebase
   * @type Ember.Service
   * @readOnly
   * @default service()
   */
  firebase: service(),

  /**
   * Firebase app service
   *
   * @property firebaseApp
   * @type Ember.Service
   * @readOnly
   * @default service()
   */
  firebaseApp: service(),

  /**
   * Store
   *
   * @property store
   * @type Ember.Service
   * @readOnly
   * @default service()
   */
  store: service(),

  /**
   * Contains all the references to a query
   *
   * @property _queryCache
   * @type Object
   * @private
   * @default null
   */
  _queryCache: null,

  /**
   * Service event.
   *
   * Workflow:
   * - Set _queryCache to an empty object
   *
   * @event init
   */
  init() {
    this._super(...arguments);

    this.set('_queryCache', {});
  },

  /**
   * Uploads a file to Firebase storage
   *
   * @method upload
   * @param {Blob} file File to upload
   * @param {String} path Storage path
   * @return {Promise|String} Download URL
   */
  upload(file, path) {
    return new RSVP.Promise((resolve, reject) => {
      let uploadTask = this.get('firebaseApp').storage().ref(path).put(file);

      uploadTask.on('state_changed', () => {}, error => {
        run(null, reject, error);
      }, () => {
        run(null, resolve, uploadTask.snapshot.downloadURL);
      });
    });
  },

  /**
   * Writes to firebase natively in fan-out style
   *
   * @method update
   * @param {Object} fanoutObject Fan-out object to write
   * @return {Promise} Resolves when update succeeds
   */
  update(fanoutObject) {
    return new RSVP.Promise((resolve, reject) => {
      this.get('firebase').update(fanoutObject, error => {
        if (error) {
          run(null, reject, error);
        } else {
          run(null, resolve, null);
        }
      });
    });
  },

  /**
   * Finds record from a Firebase path. Any changes made under the
   * Firebase path will be synchronized in realtime.
   *
   * Similar to `store.findRecord()` except that this returns the record
   * in a plain object rather than a `DS.Model`.
   *
   * @method findRecord
   * @param {String} listenerId Firebase listener ID
   * @param {String} path Path of records in Firebase
   * @return {Promise|Object} Resolves to the record
   */
  findRecord(listenerId, path) {
    return new RSVP.Promise((resolve, reject) => {
      let query = this.get('_queryCache')[listenerId];

      if (query) {
        run(null, resolve, query.record);
      } else {
        let ref = this.get('firebase').child(path);

        query = {ref: ref, path: path, record: {}};
        this.set(`_queryCache.${listenerId}`, query);

        ref.on('value', snapshot => {
          if (snapshot.exists()) {
            assign(query.record, this._serialize(snapshot.key, snapshot.val()));
            run(null, resolve, query.record);
          } else {
            this._nullifyObject(query.record);
            run(null, resolve, query.record);
          }
        }, error => {
          this._nullifyObject(query.record);
          run(null, reject, error);
        });
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
   * @method findAll
   * @param {String} path Path of records in Firebase
   * @return {Promise|Array} Resolves to all records
   */
  findAll(path) {
    return new RSVP.Promise((resolve, reject) => {
      let ref = this.get('firebase').child(path);

      ref.once('value').then(snapshot => {
        let records = [];

        if (snapshot.exists()) {
          snapshot.forEach(child => {
            records.push(this._serialize(child.key, child.val()));
          });
        }

        run(null, resolve, records);
      }).catch(error => {
        run(null, reject, error);
      });
    });
  },

  /**
   * Queries data from a Firebase path. Any changes made under the
   * Firebase path will be synchronized in realtime.
   *
   * This has the benefit of providing data for infinite scrolling
   * through the `firebaseUtil.next()` function.
   *
   * @method query
   * @param {String} modelName Model name of the records to query
   * @param {String} listenerId Firebase listener ID
   * @param {String} path Path of records in Firebase
   * @param {Object} [option={}] Query options
   * @return {Array} Records
   */
  query(modelName, listenerId, path, option = {}) {
    return new RSVP.Promise((resolve, reject) => {
      let query = this.get('_queryCache')[listenerId];

      if (!query) {
        let ref = this.get('firebase').child(path);

        query = {
          ref: ref,
          path: path,
          modelName: modelName,
          records: A()
        };
        option.orderBy = option.hasOwnProperty('orderBy') ?
            option.orderBy : 'id';
        assign(query, option);
        this.set(`_queryCache.${listenerId}`, query);

        this._setQuerySortingAndFiltering(query);

        query.ref.once('value').then(snapshot => {
          run(() => {
            if (snapshot.exists()) {
              let requests = Object.keys(snapshot.val()).map(
                  key => this.get('store').findRecord(query.modelName, key));

              RSVP.all(requests).then(records => {
                run(() => {
                  records.forEach(record => query.records.pushObject(record));
                  this._setQueryListeners(query);
                  run(null, resolve, query.records);
                });
              });
            } else {
              this._setQueryListeners(query);
              run(null, resolve, query.records);
            }
          });
        }).catch(error => {
          run(null, reject, error);
        });
      } else {
        run(null, resolve, query.records);
      }
    });
  },

  /**
   * Load more records to id in _queryCache
   *
   * @method next
   * @param {String} listenerId Listener ID
   * @param {Number} numberOfRecords Number of records to add
   */
  next(listenerId, numberOfRecords) {
    let query = this.get('_queryCache')[listenerId];

    query.ref.off();
    query.ref = this.get('firebase').child(query.path);

    if (query.hasOwnProperty('limitToFirst')) {
      query.limitToFirst += numberOfRecords;
    }

    if (query.hasOwnProperty('limitToLast')) {
      query.limitToLast += numberOfRecords;
    }

    this._setQuerySortingAndFiltering(query);
    this._setQueryListeners(query);
  },

  /**
   * Checks if record exists in Firebase
   *
   * @method isRecordExisting
   * @param {String} path Firebase path
   * @return {Promise|Boolean} Resolves to true if record exists.
   *    Otherwise false.
   */
  isRecordExisting(path) {
    return new RSVP.Promise((resolve, reject) => {
      this.get('firebase').child(path).once('value').then(snapshot => {
        run(null, resolve, snapshot.exists());
      }).catch(error => {
        run(null, reject, error);
      });
    });
  },

  /**
   * Generate a Firebase push ID for a path
   *
   * @method generateIdForRecord
   * @param {String} path Firebase path
   * @return {String} Push ID
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
   * @method _serialize
   * @param {string} key Record key
   * @param {(string|object)} value Record value
   * @return {object} Serialized record
   * @private
   */
  _serialize(key, value) {
    let record;

    if (typeOf(value) === 'object') {
      record = value;
      record.id = key;
    } else {
      record = {id: key, value: value};
    }

    return record;
  },

  /**
   * Set all the object key's value to null
   *
   * @method _nullifyObject
   * @param {Object} object Object to clear
   * @private
   */
  _nullifyObject(object) {
    for (let key in object) {
      object[key] = null;
    }
  },

  /**
   * Set the query sorting and filtering
   *
   * @method _setQuerySortingAndFiltering
   * @param {Object} query Query object
   * @private
   */
  _setQuerySortingAndFiltering(query) {
    if (query.orderBy === 'id') {
      query.ref = query.ref.orderByKey();
    } else {
      query.ref = query.ref.orderByChild(query.orderBy);
    }

    ['startAt', 'endAt', 'equalTo', 'limitToFirst', 'limitToLast'].forEach(
        type => {
          if (query.hasOwnProperty(type)) {
            query.ref = query.ref[type](query[type]);
          }
        });
  },

  /**
   * Set the query listeners
   *
   * @method _setQueryListeners
   * @param {Object} query Query object
   * @private
   */
  _setQueryListeners(query) {
    query.ref.on('child_added', snapshot => {
      run(() => {
        let key = snapshot.key;

        if (!query.records.findBy('id', key)) {
          let tempRecordIndex;
          let tempRecord = {id: key, isLoaded: false};

          if (query.hasOwnProperty('limitToFirst')) {
            query.records.pushObject(tempRecord);
            tempRecordIndex = query.records.get('length');
          } else {
            query.records.unshiftObject(tempRecord);
            tempRecordIndex = 0;
          }

          this.get('store').findRecord(query.modelName, key).then(record => {
            run(() => {
              query.records.insertAt(tempRecordIndex, record);
              query.records.removeObject(tempRecord);
            });
          });
        }
      });
    }, () => {
      run(() => query.records.clear());
    });

    query.ref.on('child_removed', snapshot => {
      run(() => {
        let record = query.records.findBy('id', snapshot.key);

        if (record) {
          query.records.removeObject(record);
        }
      });
    }, () => {
      run(() => query.records.clear());
    });
  }
});
