import { moduleFor, test } from 'ember-qunit';
import { assign } from 'ember-platform';
import run from 'ember-runloop';
import wait from 'ember-test-helpers/wait';

import createOfflineRef from 'dummy/tests/helpers/create-offline-ref';
import destroyFirebaseApps from 'dummy/tests/helpers/destroy-firebase-apps';
import sinon from 'sinon';
import stubFirebase from 'dummy/tests/helpers/stub-firebase';
import unStubFirebase from 'dummy/tests/helpers/unstub-firebase';

import fixtureData from 'dummy/tests/helpers/fixture-data';
import stubPromise from 'dummy/tests/helpers/stub-promise';

const oldFixtureData = {
  'users': {
    'foo': {
      'photoURL': 'foo.jpg',
      'username': 'bar',
    },
    'hello': {
      'photoURL': 'hello.jpg',
      'username': 'world',
    },
  },
};

/**
 * Stub for `this.store.findRecord()`
 *
 * @param {string} model
 * @param {string} id
 * @return {Promise} Fixture data
 */
function findRecordStub(model, id) {
  let record = { id: id };

  return stubPromise(true, assign(record, oldFixtureData.users[id]));
}

moduleFor('service:firebase-util', 'Unit | Service | firebase util | generateIdForRecord', {
  needs: [ 'service:firebase', 'service:firebase-app' ],

  beforeEach() {
    stubFirebase();
    this.ref = createOfflineRef(fixtureData());
  },

  afterEach() {
    unStubFirebase();
    destroyFirebaseApps();
  },
});

test('should return generated push ID', function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({ firebase: this.ref });

  // Act
  const result = service.generateIdForRecord('users');

  // Assert
  assert.ok(result);
});

moduleFor('service:firebase-util', 'Unit | Service | firebase util | uploadFile', {
  needs: [ 'service:firebase', 'service:firebase-app' ],

  beforeEach() {
    stubFirebase();
    this.ref = createOfflineRef(fixtureData());
  },

  afterEach() {
    unStubFirebase();
    destroyFirebaseApps();
  },
});

test('should upload file', async function(assert) {
  assert.expect(1);

  // Arrange
  const file = new Blob();
  const metadata = { contentType: 'image/jpeg' };
  const stub = sinon.stub().returns({
    snapshot: { downloadURL: 'foo.jpg' },

    on(stateChanged, callbackState, callbackError, callbackSuccess) {
      callbackSuccess();
    },
  });
  const service = this.subject({
    firebaseApp: {
      storage: sinon.stub().returns({
        ref: sinon.stub().returns({ put: stub }),
      }),
    },
  });

  // Act
  await service.uploadFile('images/foo', file, metadata);

  // Assert
  assert.ok(stub.calledWith(file, metadata));
});

test('should return the download url when successfully uploading a blob', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({
    firebaseApp: {
      storage: sinon.stub().returns({
        ref: sinon.stub().returns({
          put: sinon.stub().returns({
            snapshot: { downloadURL: 'foo.jpg' },

            on(stateChanged, callbackState, callbackError, callbackSuccess) {
              callbackSuccess();
            },
          }),
        }),
      }),
    },
  });

  // Act
  const result = await service.uploadFile('images/foo', new Blob());

  // Assert
  assert.equal(result, 'foo.jpg');
});

test('should call state change callback when available', async function(assert) {
  assert.expect(1);

  // Arrange
  const snapshot = { state: 'progress' };
  const spy = sinon.spy();
  const service = this.subject({
    firebaseApp: {
      storage: sinon.stub().returns({
        ref: sinon.stub().returns({
          put: sinon.stub().returns({
            snapshot: snapshot,

            on(stateChanged, callbackState) {
              callbackState(this.snapshot);
            },
          }),
        }),
      }),
    },
  });

  // Act
  service.uploadFile('images/foo', new Blob(), {}, spy);

  // Assert
  assert.ok(spy.calledWith(snapshot));
});

test('should reject promise when uploading a blob is unsuccessful', function(assert) {
  assert.expect(1);

  // Arrange
  const done = assert.async();
  const service = this.subject({
    firebaseApp: {
      storage: sinon.stub().returns({
        ref: sinon.stub().returns({
          put: sinon.stub().returns({
            snapshot: { downloadURL: 'foo.jpg' },

            on(stateChanged, callbackState, callbackError) {
              callbackError();
            },
          }),
        }),
      }),
    },
  });

  // Act
  run(() => {
    service.uploadFile('images/foo', new Blob()).catch((e) => {
      done();
      assert.ok(true);
    });
  });
});

moduleFor('service:firebase-util', 'Unit | Service | firebase util | deleteFile', {
  needs: [ 'service:firebase', 'service:firebase-app' ],

  beforeEach() {
    stubFirebase();
    this.ref = createOfflineRef(fixtureData());
  },

  afterEach() {
    unStubFirebase();
    destroyFirebaseApps();
  },
});

test('should delete a file', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({
    firebaseApp: {
      storage: sinon.stub().returns({
        refFromURL: sinon.stub().returns({
          delete: sinon.stub().returns(stubPromise(true)),
        }),
      }),
    },
  });

  // Act
  await service.deleteFile('images/foo.jpg');

  // Assert
  assert.ok(true);
});

test('should reject promise when deleting a file fails', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({
    firebaseApp: {
      storage: sinon.stub().returns({
        refFromURL: sinon.stub().returns({
          delete: sinon.stub().returns(stubPromise(false)),
        }),
      }),
    },
  });

  // Act
  try {
    await service.deleteFile('images/foo.jpg');
  } catch (e) {
    // Assert
    assert.ok(true);
  }
});

moduleFor('service:firebase-util', 'Unit | Service | firebase util | update', {
  needs: [ 'service:firebase', 'service:firebase-app' ],

  beforeEach() {
    stubFirebase();
    this.ref = createOfflineRef(fixtureData());
  },

  afterEach() {
    unStubFirebase();
    destroyFirebaseApps();
  },
});

test('should update firebase data', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({ firebase: this.ref });

  // Act
  await service.update({ 'users/user_a/name': 'Foo' });

  const snapshot = await this.ref.child('users/user_a/name').once('value');

  // Assert
  assert.equal(snapshot.val(), 'Foo');
});

moduleFor('service:firebase-util', 'Unit | Service | firebase util | queryRecord', {
  needs: [ 'service:firebase', 'service:firebase-app' ],

  beforeEach() {
    stubFirebase();
    this.ref = createOfflineRef(fixtureData());
  },

  afterEach() {
    unStubFirebase();
    destroyFirebaseApps();
  },
});

test('should return a record that matches the equalTo params', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({ firebase: this.ref });

  // Act
  const result = await service.queryRecord('comments/post_a', {
    equalTo: 'comment_b',
  });

  // Assert
  assert.deepEqual(result, {
    id: 'comment_b',
    message: 'Comment B',
    timestamp: 12345,
    author: 'user_b',
  });
});

test('should return a record that matches the startAt params', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({ firebase: this.ref });

  // Act
  const result = await service.queryRecord('comments/post_a', {
    startAt: 'comment',
  });

  // Assert
  assert.deepEqual(result, {
    id: 'comment_a',
    message: 'Comment A',
    timestamp: 12345,
    author: 'user_b',
  });
});

test('should return a record that matches the endAt params', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({ firebase: this.ref });

  // Act
  const result = await service.queryRecord('comments/post_a', {
    endAt: 'comment_a',
  });

  // Assert
  assert.deepEqual(result, {
    id: 'comment_a',
    message: 'Comment A',
    timestamp: 12345,
    author: 'user_b',
  });
});

test('should error when record does not exist', async function(assert) {
  assert.expect(1);

  // Arrange
  const done = assert.async();
  const service = this.subject({ firebase: this.ref });

  // Act
  run(() => {
    service.queryRecord('users/unknown').catch((e) => {
      done();
      assert.ok(true);
    });
  });
});

test('should update in realtime when cacheId is provided', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({ firebase: this.ref });

  // Act
  const result = await service.queryRecord('comments/post_a', {
    cacheId: 'cache_id',
    equalTo: 'comment_a',
  });

  await service.update({ 'comments/post_a/comment_a/message': 'Foo' });

  // Assert
  assert.deepEqual(result, {
    id: 'comment_a',
    message: 'Foo',
    timestamp: 12345,
    author: 'user_b',
  });
});

test('should return cached record when available', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({ firebase: this.ref });

  // Act
  await service.queryRecord('comments/post_a', {
    cacheId: 'cache_id',
    equalTo: 'comment_a',
  });

  // `cache_id` listener should already exists. Thus, even if we provide a
  // path that doesn't exist, the cached record should be returned.
  const result = await service.queryRecord('unknown', { cacheId: 'cache_id' });

  // Assert
  assert.deepEqual(result, {
    id: 'comment_a',
    message: 'Comment A',
    timestamp: 12345,
    author: 'user_b',
  });
});

moduleFor('service:firebase-util', 'Unit | Service | firebase util | query (new usage)', {
  needs: [ 'service:firebase', 'service:firebase-app' ],

  beforeEach() {
    stubFirebase();
    this.ref = createOfflineRef(fixtureData());
  },

  afterEach() {
    unStubFirebase();
    destroyFirebaseApps();
  },
});

// Order queries doesn't work in MockFirebase.
// See: https://github.com/katowulf/mockfirebase/pull/61
test('should return records ordered by key', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({ firebase: this.ref });

  // Act
  const result = await service.query('comments/post_a');

  // Assert
  assert.deepEqual(result, [{
    id: 'comment_a',
    message: 'Comment A',
    timestamp: 12345,
    author: 'user_b',
  }, {
    id: 'comment_b',
    message: 'Comment B',
    timestamp: 12345,
    author: 'user_b',
  }]);
});

test('should return records matching the equalTo param', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({ firebase: this.ref });

  // Act
  const result = await service.query('comments/post_a', {
    equalTo: 'comment_a',
  });

  // Assert
  assert.deepEqual(result, [{
    id: 'comment_a',
    message: 'Comment A',
    timestamp: 12345,
    author: 'user_b',
  }]);
});

test('should return records matching the startAt param', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({ firebase: this.ref });

  // Act
  const result = await service.query('comments/post_a', {
    startAt: 'comment',
  });

  // Assert
  assert.deepEqual(result, [{
    id: 'comment_a',
    message: 'Comment A',
    timestamp: 12345,
    author: 'user_b',
  }, {
    id: 'comment_b',
    message: 'Comment B',
    timestamp: 12345,
    author: 'user_b',
  }]);
});

test('should return records matching the endAt param', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({ firebase: this.ref });

  // Act
  const result = await service.query('comments/post_a', {
    equalTo: 'comment_b',
  });

  // Assert
  assert.deepEqual(result, [{
    id: 'comment_b',
    message: 'Comment B',
    timestamp: 12345,
    author: 'user_b',
  }]);
});

test('should return records matching the limitToFirst param', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({ firebase: this.ref });

  // Act
  const result = await service.query('comments/post_a', {
    limitToFirst: 1,
  });

  // Assert
  assert.deepEqual(result, [{
    id: 'comment_a',
    message: 'Comment A',
    timestamp: 12345,
    author: 'user_b',
  }]);
});

test('should return records matching the limitToLast param', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({ firebase: this.ref });

  // Act
  const result = await service.query('comments/post_a', {
    limitToLast: 1,
  });

  // Assert
  assert.deepEqual(result, [{
    id: 'comment_b',
    message: 'Comment B',
    timestamp: 12345,
    author: 'user_b',
  }]);
});

test('should return no records when nothing matches the query', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({ firebase: this.ref });

  // Act
  const result = await service.query('comments/unknown', {
    equalTo: 'comment_a',
  });

  // Assert
  assert.deepEqual(result, []);
});

test('should update query array in realtime when cacheId is provided', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({ firebase: this.ref });

  // Act
  const result = await service.query('comments/post_a', {
    cacheId: 'cache_id',
    limitToLast: 1,
  });

  await service.update({
    'comments/post_a/comment_c': {
      message: 'Comment C',
      timestamp: 12345,
      author: 'user_b',
    },
  });

  // Assert
  assert.deepEqual(result, [{
    id: 'comment_c',
    message: 'Comment C',
    timestamp: 12345,
    author: 'user_b',
  }]);
});

test('should update query record in realtime when cacheId is provided', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({ firebase: this.ref });

  // Act
  const result = await service.query('comments/post_a', {
    cacheId: 'cache_id',
    limitToFirst: 1,
  });

  await service.update({ 'comments/post_a/comment_a/message': 'Foo' });

  // Assert
  assert.deepEqual(result, [{
    id: 'comment_a',
    message: 'Foo',
    timestamp: 12345,
    author: 'user_b',
  }]);
});

test('should return cached records when available', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({ firebase: this.ref });

  // Act
  await service.query('comments/post_a', {
    cacheId: 'cache_id',
    equalTo: 'comment_a',
  });

  // `cache_id` listener should already exists. Thus, even if we provide a
  // path that doesn't exist, the cached record should be returned.
  const result = await service.query('unknown', { cacheId: 'cache_id' });

  // Assert
  assert.deepEqual(result, [{
    id: 'comment_a',
    message: 'Comment A',
    timestamp: 12345,
    author: 'user_b',
  }]);
});

test('should load next limitToFirst records when requesting it', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({ firebase: this.ref });

  // Act
  const result = await service.query('comments/post_a', {
    cacheId: 'cache_id',
    limitToFirst: 1,
  });

  await service.next('cache_id', 1);

  // Assert
  assert.deepEqual(result, [{
    id: 'comment_a',
    message: 'Comment A',
    timestamp: 12345,
    author: 'user_b',
  }, {
    id: 'comment_b',
    message: 'Comment B',
    timestamp: 12345,
    author: 'user_b',
  }]);
});

test('should load next limitToLast records when requesting it', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({ firebase: this.ref });

  // Act
  const result = await service.query('comments/post_a', {
    cacheId: 'cache_id',
    limitToLast: 1,
  });

  await service.next('cache_id', 1);

  // Assert
  assert.deepEqual(result, [{
    id: 'comment_a',
    message: 'Comment A',
    timestamp: 12345,
    author: 'user_b',
  }, {
    id: 'comment_b',
    message: 'Comment B',
    timestamp: 12345,
    author: 'user_b',
  }]);
});

moduleFor('service:firebase-util', 'Unit | Service | firebase util | query (old usage)', {
  needs: [ 'service:firebase', 'service:firebase-app' ],

  beforeEach() {
    stubFirebase();
    this.ref = createOfflineRef(oldFixtureData);
  },

  afterEach() {
    unStubFirebase();
    destroyFirebaseApps();
  },
});

// Order queries doesn't work in MockFirebase.
// See: https://github.com/katowulf/mockfirebase/pull/61
test('should query ordered by key', function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = [{
    id: 'foo',
    photoURL: 'foo.jpg',
    username: 'bar',
  }, {
    id: 'hello',
    photoURL: 'hello.jpg',
    username: 'world',
  }];
  let service = this.subject({
    store: { findRecord: findRecordStub },
    firebase: this.ref,
  });

  // Act
  service.query('user', 'id', 'users').then((actual) => {
    // Assert
    assert.deepEqual(actual, EXPECTED);
  });
});

test('should query equal to value', function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = [{ id: 'foo', photoURL: 'foo.jpg', username: 'bar' }];
  let service = this.subject({
    store: { findRecord: findRecordStub },
    firebase: this.ref,
  });

  // Act
  service.query('user', 'id', 'users', {
    equalTo: 'foo',
  }).then((actual) => {
    // Assert
    assert.deepEqual(actual, EXPECTED);
  });
});

test('should query start at and end at value', function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = [{ id: 'foo', photoURL: 'foo.jpg', username: 'bar' }];
  let service = this.subject({
    store: { findRecord: findRecordStub },
    firebase: this.ref,
  });

  // Act
  service.query('user', 'id', 'users', {
    startAt: 'fo',
    endAt: 'fo\uf8ff',
  }).then((actual) => {
    // Assert
    assert.deepEqual(actual, EXPECTED);
  });
});

test('should query limit to first records', function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = [{ id: 'foo', photoURL: 'foo.jpg', username: 'bar' }];
  let service = this.subject({
    store: { findRecord: findRecordStub },
    firebase: this.ref,
  });

  // Act
  service.query('user', 'id', 'users', {
    limitToFirst: 1,
  }).then((actual) => {
    // Assert
    assert.deepEqual(actual, EXPECTED);
  });
});

test('should query limit to last records', function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = [{
    id: 'hello',
    photoURL: 'hello.jpg',
    username: 'world',
  }];
  let service = this.subject({
    store: { findRecord: findRecordStub },
    firebase: this.ref,
  });

  // Act
  service.query('user', 'id', 'users', {
    limitToLast: 1,
  }).then((actual) => {
    // Assert
    assert.deepEqual(actual, EXPECTED);
  });
});

test('should pick up changes on query', function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = [];
  let service = this.subject({
    store: { findRecord: findRecordStub },
    firebase: this.ref,
  });

  // Act
  let actual;

  service.query('user', 'id', 'users', {
    equalTo: 'foo',
  }).then((record) => {
    actual = record;

    service.update({ 'users/foo': null });
  });

  // Assert
  return wait().then(() => assert.deepEqual(actual, EXPECTED));
});

test('should return cached records on query when available', function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = [{
    id: 'foo',
    photoURL: 'foo.jpg',
    username: 'bar',
  }, {
    id: 'hello',
    photoURL: 'hello.jpg',
    username: 'world',
  }];
  let service = this.subject({
    store: { findRecord: findRecordStub },
    firebase: this.ref,
  });

  // Act
  service.query('user', 'id', 'users').then(() => {
    // `id` listener should already exists. Thus, even if we provide a
    // path that doesn't exist, the cached record should be returned.
    service.query('user', 'id', 'unknown').then((actual) => {
      // Assert
      assert.deepEqual(actual, EXPECTED);
    });
  });
});

test('should keep track of query record changes', function(assert) {
  assert.expect(1);

  // Arrange
  let service = this.subject({
    store: { findRecord: findRecordStub },
    firebase: this.ref,
  });
  let spy = sinon.spy(service, 'set');

  // Act
  service.query('user', 'id', 'users');

  // Assert
  assert.ok(spy.calledWith('_queryCache.id'));
});

test('should request for the next limitToFirst records', function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = [{
    id: 'foo',
    photoURL: 'foo.jpg',
    username: 'bar',
  }, {
    id: 'hello',
    photoURL: 'hello.jpg',
    username: 'world',
  }];
  let service = this.subject({
    store: { findRecord: findRecordStub },
    firebase: this.ref,
  });

  // Act
  service.query('user', 'id', 'users', {
    limitToFirst: 1,
  }).then(() => service.next('id', 1));

  return wait().then(() => {
    service.query('user', 'id', 'users', {
      limitToFirst: 1,
    }).then((actual) => {
      // Assert
      assert.deepEqual(actual, EXPECTED);
    });
  });
});

test('should request for the next limitToLast records', function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = [{
    id: 'foo',
    photoURL: 'foo.jpg',
    username: 'bar',
  }, {
    id: 'hello',
    photoURL: 'hello.jpg',
    username: 'world',
  }];
  let service = this.subject({
    store: { findRecord: findRecordStub },
    firebase: this.ref,
  });

  // Act
  service.query('user', 'id', 'users', {
    limitToLast: 1,
  }).then(() => service.next('id', 1));

  return wait().then(() => {
    service.query('user', 'id', 'users', {
      limitToLast: 1,
    }).then((actual) => {
      // Assert
      assert.deepEqual(actual, EXPECTED);
    });
  });
});

moduleFor('service:firebase-util', 'Unit | Service | firebase util | isRecordExisting', {
  needs: [ 'service:firebase', 'service:firebase-app' ],

  beforeEach() {
    stubFirebase();
    this.ref = createOfflineRef(fixtureData());
  },

  afterEach() {
    unStubFirebase();
    destroyFirebaseApps();
  },
});

test('should return true when record exists', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({ firebase: this.ref });

  // Act
  const result = await service.isRecordExisting('users/user_a');

  // Assert
  assert.equal(result, true);
});

test('should return false when record does not exist', async function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({ firebase: this.ref });

  // Act
  const result = await service.isRecordExisting('users/unknown');

  // Assert
  assert.equal(result, false);
});

moduleFor('service:firebase-util', 'Unit | Service | firebase util | findRecord', {
  needs: [ 'service:firebase', 'service:firebase-app' ],

  beforeEach() {
    stubFirebase();
    this.ref = createOfflineRef(oldFixtureData);
  },

  afterEach() {
    unStubFirebase();
    destroyFirebaseApps();
  },
});

test('should return record', async function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = { id: 'foo', photoURL: 'foo.jpg', username: 'bar' };
  const service = this.subject({ firebase: this.ref });

  // Act
  service.findRecord('id', 'users/foo').then((actual) => {
    // Assert
    assert.deepEqual(actual, EXPECTED);
  });
});

test('should return an empty object when finding a record that does not exist', function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = {};
  const service = this.subject({ firebase: this.ref });

  // Act
  service.findRecord('id', 'users/unknown').then((actual) => {
    // Assert
    assert.deepEqual(actual, EXPECTED);
  });
});

test('should pick up changes on find record', function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = { id: 'foo', photoURL: 'foobar.jpg', username: 'bar' };
  const service = this.subject({ firebase: this.ref });

  // Act
  let actual;

  service.findRecord('id', 'users/foo').then((record) => {
    actual = record;

    service.update({ 'users/foo/photoURL': 'foobar.jpg' });
  });

  // Assert
  return wait().then(() => assert.deepEqual(actual, EXPECTED));
});

// TODO: Find a good way to test this
// test('should reject when finding record fails', function(assert) {
//   assert.expect(1);

//   // Arrange
//   let ref = new Object(this.ref);

//   ref.child = sinon.stub().returns({
//     on: sinon.stub().returns(stubPromise(false))
//   });

//   let service = this.subject({firebase: ref});

//   // Act
//   service.findRecord('id', 'users/foo').catch(() => {
//     // Assert
//     assert.ok(true);
//   });
// });

test('should return cached records on find record when available', function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = { id: 'foo', photoURL: 'foo.jpg', username: 'bar' };
  const service = this.subject({ firebase: this.ref });

  // Act
  service.findRecord('id', 'users/foo').then(() => {
    // `id` listener should already exists. Thus, even if we provide a
    // path that doesn't exist, the cached record should be returned.
    service.findRecord('id', 'foo').then((actual) => {
      // Assert
      assert.deepEqual(actual, EXPECTED);
    });
  });
});

test('should keep track of find record changes', function(assert) {
  assert.expect(1);

  // Arrange
  const service = this.subject({ firebase: this.ref });
  const spy = sinon.spy(service, 'set');

  // Act
  service.findRecord('id', 'users/foo');

  // Assert
  assert.ok(spy.calledWith('_queryCache.id'));
});

moduleFor('service:firebase-util', 'Unit | Service | firebase util | findAll', {
  needs: [ 'service:firebase', 'service:firebase-app' ],

  beforeEach() {
    stubFirebase();
    this.ref = createOfflineRef(oldFixtureData);
  },

  afterEach() {
    unStubFirebase();
    destroyFirebaseApps();
  },
});

test('should find all records', function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = [{
    id: 'foo',
    photoURL: 'foo.jpg',
    username: 'bar',
  }, {
    id: 'hello',
    photoURL: 'hello.jpg',
    username: 'world',
  }];
  const service = this.subject({ firebase: this.ref });

  // Act
  service.findAll('users').then((actual) => {
    // Assert
    assert.deepEqual(actual, EXPECTED);
  });
});

test('should return an empty array when finding all records that does not exist', function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = [];
  const service = this.subject({ firebase: this.ref });

  // Act
  service.findAll('id', 'unknown').then((actual) => {
    // Assert
    assert.deepEqual(actual, EXPECTED);
  });
});

// TODO: Find a good way to test this
// test('should reject when finding all records fails', function(assert) {
//   assert.expect(1);

//   // Arrange
//   const ref = new Object(this.ref);

//   ref.child = sinon.stub().returns({
//     once: sinon.stub().returns(stubPromise(false))
//   });

//   const service = this.subject({firebase: ref});

//   // Act
//   service.findAll('id', null).catch(() => {
//     // Assert
//     assert.ok(true);
//   });
// });
