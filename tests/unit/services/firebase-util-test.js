import { moduleFor, test } from 'ember-qunit';
import { assign } from 'ember-platform';
import wait from 'ember-test-helpers/wait';

import createOfflineRef from 'dummy/tests/helpers/create-offline-ref';
import sinon from 'sinon';
import stubFirebase from 'dummy/tests/helpers/stub-firebase';
import unStubFirebase from 'dummy/tests/helpers/unstub-firebase';

import stubPromise from 'dummy/tests/helpers/stub-promise';

const FIXTURE_DATA = {
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

moduleFor('service:firebase-util', 'Unit | Service | firebase util', {
  beforeEach() {
    stubFirebase();
    this.ref = createOfflineRef(FIXTURE_DATA);
  },

  afterEach() {
    unStubFirebase();
  },
});

/**
 * Stub for `this.store.findRecord()`
 *
 * @param {string} model
 * @param {string} id
 * @return {Promise} Fixture data
 */
function findRecordStub(model, id) {
  let record = { id: id };

  return stubPromise(true, assign(record, FIXTURE_DATA.users[id]));
}

test('should upload file', function(assert) {
  assert.expect(1);

  // Arrange
  const FILE = new Blob();
  const METADATA = { contentType: 'image/jpeg' };
  let stub = sinon.stub().returns({
    snapshot: { downloadURL: 'foo.jpg' },

    on(stateChanged, callbackState, callbackError, callbackSuccess) {
      callbackSuccess();
    },
  });
  let service = this.subject({
    firebaseApp: {
      storage: sinon.stub().returns({
        ref: sinon.stub().returns({ put: stub }),
      }),
    },
  });

  // Act
  service.uploadFile('images/foo', FILE, METADATA).then(() => {
    // Assert
    assert.ok(stub.calledWith(FILE, METADATA));
  });
});

test('should return the download url when successfully uploading a blob', function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = 'foo.jpg';
  let service = this.subject({
    firebaseApp: {
      storage: sinon.stub().returns({
        ref: sinon.stub().returns({
          put: sinon.stub().returns({
            snapshot: { downloadURL: EXPECTED },

            on(stateChanged, callbackState, callbackError, callbackSuccess) {
              callbackSuccess();
            },
          }),
        }),
      }),
    },
  });

  // Act
  service.uploadFile('images/foo', new Blob()).then((actual) => {
    // Assert
    assert.equal(actual, EXPECTED);
  });
});

test('should call state change callback when available', function(assert) {
  assert.expect(1);

  // Arrange
  const SNAPSHOT = { state: 'progress' };
  let spy = sinon.spy();
  let service = this.subject({
    firebaseApp: {
      storage: sinon.stub().returns({
        ref: sinon.stub().returns({
          put: sinon.stub().returns({
            snapshot: SNAPSHOT,

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
  assert.ok(spy.calledWith(SNAPSHOT));
});

test('should reject promise when uploading a blob is unsuccessful', function(assert) {
  assert.expect(1);

  // Arrange
  let service = this.subject({
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
  service.uploadFile('images/foo', new Blob()).catch(() => {
    // Assert
    assert.ok(true);
  });
});

test('should delete a file', function(assert) {
  assert.expect(1);

  // Arrange
  let service = this.subject({
    firebaseApp: {
      storage: sinon.stub().returns({
        refFromURL: sinon.stub().returns({
          delete: sinon.stub().returns(stubPromise(true)),
        }),
      }),
    },
  });

  // Act
  service.deleteFile('images/foo.jpg').then(() => {
    assert.ok(true);
  });
});

test('should reject promise when deleting a file fails', function(assert) {
  assert.expect(1);

  // Arrange
  let service = this.subject({
    firebaseApp: {
      storage: sinon.stub().returns({
        refFromURL: sinon.stub().returns({
          delete: sinon.stub().returns(stubPromise(false)),
        }),
      }),
    },
  });

  // Act
  service.deleteFile('images/foo.jpg').catch(() => {
    assert.ok(true);
  });
});

test('should update firebase data', function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = 'foobar.jpg';
  let service = this.subject({ firebase: this.ref });

  // Act
  service.update({ 'users/foo/photoURL': 'foobar.jpg' });
  this.ref.child('users/foo/photoURL').once('value').then((snapshot) => {
    // Assert
    assert.equal(snapshot.val(), EXPECTED);
  });
});

test('should find record', function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = { id: 'foo', photoURL: 'foo.jpg', username: 'bar' };
  let service = this.subject({ firebase: this.ref });

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
  let service = this.subject({ firebase: this.ref });

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
  let service = this.subject({ firebase: this.ref });

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
  let service = this.subject({ firebase: this.ref });

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
  let service = this.subject({ firebase: this.ref });
  let spy = sinon.spy(service, 'set');

  // Act
  service.findRecord('id', 'users/foo');

  // Assert
  assert.ok(spy.calledWith('_queryCache.id'));
});

test('should find all records', function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = [ {
    id: 'foo',
    photoURL: 'foo.jpg',
    username: 'bar',
  }, {
    id: 'hello',
    photoURL: 'hello.jpg',
    username: 'world',
  } ];
  let service = this.subject({ firebase: this.ref });

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
  let service = this.subject({ firebase: this.ref });

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
//   let ref = new Object(this.ref);

//   ref.child = sinon.stub().returns({
//     once: sinon.stub().returns(stubPromise(false))
//   });

//   let service = this.subject({firebase: ref});

//   // Act
//   service.findAll('id', null).catch(() => {
//     // Assert
//     assert.ok(true);
//   });
// });

// TODO: Add tests for orderByChild and orderByValue. Last I checked,
// it wasn't working during tests runs but it works on production.
test('should query ordered by key', function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = [ {
    id: 'foo',
    photoURL: 'foo.jpg',
    username: 'bar',
  }, {
    id: 'hello',
    photoURL: 'hello.jpg',
    username: 'world',
  } ];
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
  const EXPECTED = [ { id: 'foo', photoURL: 'foo.jpg', username: 'bar' } ];
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
  const EXPECTED = [ { id: 'foo', photoURL: 'foo.jpg', username: 'bar' } ];
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
  const EXPECTED = [ { id: 'foo', photoURL: 'foo.jpg', username: 'bar' } ];
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
  const EXPECTED = [ {
    id: 'hello',
    photoURL: 'hello.jpg',
    username: 'world',
  } ];
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
  const EXPECTED = [ {
    id: 'foo',
    photoURL: 'foo.jpg',
    username: 'bar',
  }, {
    id: 'hello',
    photoURL: 'hello.jpg',
    username: 'world',
  } ];
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
  const EXPECTED = [ {
    id: 'foo',
    photoURL: 'foo.jpg',
    username: 'bar',
  }, {
    id: 'hello',
    photoURL: 'hello.jpg',
    username: 'world',
  } ];
  let service = this.subject({
    store: { findRecord: findRecordStub },
    firebase: this.ref,
  });

  // Act
  // service.query('user', 'id', 'users', {
  //   limitToFirst: 1,
  // }).then(() => {
  //   service.next('id', 1).then(() => {
  //     service.query('user', 'id', 'users', {
  //       limitToFirst: 1,
  //     }).then((actual) => {
  //       // Assert
  //       assert.deepEqual(actual, EXPECTED);
  //     });
  //   });
  // });

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
  const EXPECTED = [ {
    id: 'foo',
    photoURL: 'foo.jpg',
    username: 'bar',
  }, {
    id: 'hello',
    photoURL: 'hello.jpg',
    username: 'world',
  } ];
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

test('should return true when checking if record exists and it does', function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = true;
  let service = this.subject({ firebase: this.ref });

  // Act
  service.isRecordExisting('users/foo').then((actual) => {
    // Assert
    assert.equal(actual, EXPECTED);
  });
});

test('should return false when checking if record exists and it does not', function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = false;
  let service = this.subject({ firebase: this.ref });

  // Act
  service.isRecordExisting('users/unknown').then((actual) => {
    // Assert
    assert.equal(actual, EXPECTED);
  });
});

test('should return generated push ID', function(assert) {
  assert.expect(1);

  // Arrange
  let result;
  let service = this.subject({ firebase: this.ref });

  // Act
  result = service.generateIdForRecord('users');

  // Assert
  assert.ok(result);
});
