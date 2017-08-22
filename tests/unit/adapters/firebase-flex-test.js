import { A } from 'ember-array/utils';
import { moduleFor, test } from 'ember-qunit';
import EmberObject from 'ember-object';
import run, { next } from 'ember-runloop';

import createOfflineRef from 'dummy/tests/helpers/create-offline-ref';
import destroyFirebaseApps from 'dummy/tests/helpers/destroy-firebase-apps';
import firebase from 'firebase';
import sinon from 'sinon';
import stubFirebase from 'dummy/tests/helpers/stub-firebase';
import unStubFirebase from 'dummy/tests/helpers/unstub-firebase';

import getFixtureData from 'dummy/tests/helpers/fixture-data';
import stubPromise from 'dummy/tests/helpers/stub-promise';

moduleFor('adapter:firebase-flex', 'Unit | Adapter | firebase flex | generateIdForRecord', {
  needs: [ 'service:firebase' ],

  beforeEach() {
    stubFirebase();
    this.ref = createOfflineRef(getFixtureData());
  },

  afterEach() {
    unStubFirebase();
    destroyFirebaseApps();
  },
});

test('should generate ID for record', function(assert) {
  assert.expect(1);

  // Arrange
  const adapter = this.subject({
    firebase: this.ref,
  });

  // Act
  const result = adapter.generateIdForRecord();

  // Assert
  assert.ok(result);
});

moduleFor('adapter:firebase-flex', 'Unit | Adapter | firebase flex | createRecord', {
  needs: [ 'service:firebase' ],

  beforeEach() {
    stubFirebase();
    this.ref = createOfflineRef(getFixtureData());
    this.store = {
      normalize() {},
      push() {},
    };
    this.type = { modelName: 'blog-post' };
  },

  afterEach() {
    unStubFirebase();
    destroyFirebaseApps();
  },
});

test('should update Firebase', async function(assert) {
  assert.expect(2);

  // Arrange
  const serializedSnapshot = {
    'foo/bar/dee/post_c/message': 'Message',
    'foo/bar/dee/post_c/timestamp': firebase.database.ServerValue.TIMESTAMP,
    'userFeeds/user_a/post_c': true,
    'userFeeds/user_b/post_c': true,
  };
  const updateSpy = sinon.spy(this.ref, 'update');
  const record = EmberObject.create();
  const setSpy = sinon.spy(record, 'set');
  const adapter = this.subject({
    firebase: this.ref,
    serialize: sinon.stub().returns(serializedSnapshot),
  });

  // Act
  await adapter.createRecord(this.store, this.type, {
    id: 'post_c',
    message: 'Message',
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    adapterOptions: {
      path: 'foo/bar/dee',
      include: {
        'userFeeds/user_a/post_c': true,
        'userFeeds/user_b/post_c': true,
      },
    },
    record: record,
  });

  // Assert
  assert.ok(setSpy.calledWithExactly('_innerReferencePath', 'bar/dee'));
  assert.ok(updateSpy.calledWith({
    'foo/bar/dee/post_c/message': 'Message',
    'foo/bar/dee/post_c/timestamp': firebase.database.ServerValue.TIMESTAMP,
    'userFeeds/user_a/post_c': true,
    'userFeeds/user_b/post_c': true,
  }));
});

test('should track changes to record when not in FastBoot', async function(assert) {
  assert.expect(1);

  // Arrange
  const serializedSnapshot = {
    'blogPosts/post_c/message': 'Message',
    'blogPosts/post_c/timestamp': firebase.database.ServerValue.TIMESTAMP,
  };
  const spy = sinon.spy(this.store, 'push');
  const adapter = this.subject({
    firebase: this.ref,
    serialize: sinon.stub().returns(serializedSnapshot),
  });

  // Act
  await adapter.createRecord(this.store, this.type, {
    id: 'post_c',
    message: 'Message',
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    record: EmberObject.create(),
  });
  await this.ref.child('blogPosts/post_c').update({ 'message': 'Foo' });

  // Assert
  next(() => {
    assert.ok(spy.calledTwice);
  });
});

test('should not track changes to record when in FastBoot', async function(assert) {
  assert.expect(1);

  // Arrange
  const serializedSnapshot = {
    'blogPosts/post_c/message': 'Message',
    'blogPosts/post_c/timestamp': firebase.database.ServerValue.TIMESTAMP,
  };
  const spy = sinon.spy(this.store, 'push');
  const adapter = this.subject({
    firebase: this.ref,
    fastboot: EmberObject.create({ isFastBoot: true }),
    serialize: sinon.stub().returns(serializedSnapshot),
  });

  // Act
  await adapter.createRecord(this.store, this.type, {
    id: 'post_c',
    message: 'Message',
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    record: EmberObject.create(),
  });
  await this.ref.child('blogPosts/post_c').update({ 'message': 'Foo' });

  // Assert
  next(() => {
    assert.ok(spy.notCalled);
  });
});

test('should unload record when it gets deleted from the backend', async function(assert) {
  assert.expect(1);

  // Arrange
  const record = EmberObject.create({ isSaving: false });
  const serializedSnapshot = {
    'blogPosts/post_c/message': 'Message',
    'blogPosts/post_c/timestamp': firebase.database.ServerValue.TIMESTAMP,
  };
  const stub = sinon.stub();

  this.store = {
    normalize: sinon.stub().returns('foo'),
    peekRecord: sinon.stub().returns(record),
    push: sinon.stub(),
    unloadRecord: stub,
  };

  const adapter = this.subject({
    firebase: this.ref,
    serialize: sinon.stub().returns(serializedSnapshot),
  });

  // Act
  await adapter.createRecord(this.store, this.type, {
    id: 'post_c',
    message: 'Message',
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    record: EmberObject.create(),
  });
  await this.ref.child('blogPosts/post_c').remove();

  // Assert
  assert.ok(stub.calledWithExactly(record));
});

moduleFor('adapter:firebase-flex', 'Unit | Adapter | firebase flex | updateRecord', {
  needs: [ 'service:firebase' ],

  beforeEach() {
    stubFirebase();
    this.ref = createOfflineRef(getFixtureData());
    this.store = { normalize() {}, push() {} };
    this.type = { modelName: 'blog-post' };
  },

  afterEach() {
    unStubFirebase();
    destroyFirebaseApps();
  },
});

test('should update Firebase when updating a record', async function(assert) {
  assert.expect(1);

  // Arrange
  const serializedSnapshot = {
    'blogPosts/post_a/message': 'Message',
    'blogPosts/post_a/timestamp': firebase.database.ServerValue.TIMESTAMP,
    'userFeeds/user_a/post_a': true,
    'userFeeds/user_b/post_a': true,
  };
  const spy = sinon.spy(this.ref, 'update');
  const adapter = this.subject({
    firebase: this.ref,
    serialize: sinon.stub().returns(serializedSnapshot),
  });

  // Act
  await adapter.updateRecord(this.store, this.type, {
    id: 'post_a',
    message: 'Message',
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    adapterOptions: {
      include: {
        'userFeeds/user_a/post_a': true,
        'userFeeds/user_b/post_a': true,
      },
    },
    record: EmberObject.create(),
  });

  // Assert
  assert.ok(spy.calledWith({
    'blogPosts/post_a/message': 'Message',
    'blogPosts/post_a/timestamp': firebase.database.ServerValue.TIMESTAMP,
    'userFeeds/user_a/post_a': true,
    'userFeeds/user_b/post_a': true,
  }));
});

moduleFor('adapter:firebase-flex', 'Unit | Adapter | firebase flex | findRecord', {
  needs: [ 'service:firebase' ],

  beforeEach() {
    stubFirebase();
    this.ref = createOfflineRef(getFixtureData());
    this.store = {
      normalize() {},
      push() {},
    };
    this.type = { modelName: 'blog-post' };
  },

  afterEach() {
    unStubFirebase();
    destroyFirebaseApps();
  },
});

test('should return fetched record', async function(assert) {
  assert.expect(1);

  // Arrange
  const adapter = this.subject({
    firebase: this.ref,
  });

  // Act
  const result = await adapter.findRecord(this.store, this.type, 'post_a');

  // Arrange
  assert.deepEqual(result, {
    id: 'post_a',
    message: 'Post A',
    timestamp: 1483228800000,
    author: 'user_a',
    _innerReferencePath: '',
  });
});

test('should error when record does not exist', function(assert) {
  assert.expect(1);

  // Arrange
  const done = assert.async();
  const adapter = this.subject({
    firebase: this.ref,
  });

  // Act
  run(() => {
    adapter.findRecord(this.store, this.type, 'post_z').catch((e) => {
      done();
      assert.ok(true);
    });
  });
});

test('should track changes to record when not in FastBoot', async function(assert) {
  assert.expect(1);

  // Arrange
  const spy = sinon.spy(this.store, 'push');
  const adapter = this.subject({
    firebase: this.ref,
  });

  // Act
  await adapter.findRecord(this.store, this.type, 'post_a');
  await this.ref.child('blogPosts/post_a').update({ 'message': 'Foo' });

  // Arrange
  next(() => {
    assert.ok(spy.calledTwice);
  });
});

test('should not track changes to record when in FastBoot', async function(assert) {
  assert.expect(1);

  // Arrange
  const spy = sinon.spy(this.store, 'push');
  const adapter = this.subject({
    firebase: this.ref,
    fastboot: EmberObject.create({ isFastBoot: true }),
  });

  // Act
  await adapter.findRecord(this.store, this.type, 'post_a');

  // Arrange
  next(() => {
    assert.ok(spy.notCalled);
  });
});

test('should not duplicate trackers', async function(assert) {
  assert.expect(1);

  // Arrange
  const spy = sinon.spy(this.store, 'push');
  const adapter = this.subject({
    firebase: this.ref,
  });

  // Act
  await adapter.findRecord(this.store, this.type, 'post_a');
  await adapter.findRecord(this.store, this.type, 'post_a');
  await this.ref.child('blogPosts/post_a').update({ 'message': 'Foo' });

  // Arrange
  next(() => {
    assert.ok(spy.calledTwice);
  });
});

test('should unload record when it gets deleted from the backend', async function(assert) {
  assert.expect(1);

  // Arrange
  const record = EmberObject.create({ isSaving: false });
  const stub = sinon.stub();

  this.store = {
    normalize: sinon.stub().returns('foo'),
    peekRecord: sinon.stub().returns(record),
    push: sinon.stub(),
    unloadRecord: stub,
  };

  const adapter = this.subject({
    firebase: this.ref,
  });

  // Act
  await adapter.findRecord(this.store, this.type, 'post_a');
  await this.ref.child('blogPosts/post_a').remove();

  // Arrange
  assert.ok(stub.calledWithExactly(record));
});

moduleFor('adapter:firebase-flex', 'Unit | Adapter | firebase flex | findAll', {
  needs: [ 'service:firebase' ],

  beforeEach() {
    stubFirebase();
    this.ref = createOfflineRef(getFixtureData());
    this.store = {
      normalize() {},
      push() {},
    };
    this.type = { modelName: 'blog-post' };
    this.blogPosts = [{
      id: 'post_a',
      _internalModel: { id: 'post_a' },
    }, {
      id: 'post_b',
      _internalModel: { id: 'post_b' },
    }, {
      id: 'post_c',
      _internalModel: { id: 'post_c' },
    }];

    const findRecordStub = sinon.stub();

    findRecordStub.withArgs(this.store, this.type, 'post_a').returns(
        stubPromise(true, this.blogPosts[0]));
    findRecordStub.withArgs(this.store, this.type, 'post_b').returns(
        stubPromise(true, this.blogPosts[1]));
    findRecordStub.withArgs(this.store, this.type, 'post_c').returns(
        stubPromise(true, this.blogPosts[2]));

    this.findRecord = findRecordStub;
  },

  afterEach() {
    unStubFirebase();
    destroyFirebaseApps();
  },
});

test('should return all records for a model', async function(assert) {
  assert.expect(1);

  // Arrange
  const adapter = this.subject({
    firebase: this.ref,
    findRecord: this.findRecord,
  });

  // Act
  const result = await adapter.findAll(this.store, this.type);

  // Arrange
  assert.deepEqual(result, [ this.blogPosts[0], this.blogPosts[1] ]);
});

test('should return an empty array when no record exists', async function(assert) {
  assert.expect(1);

  // Arrange
  const adapter = this.subject({
    firebase: this.ref,
  });

  // Act
  const result = await adapter.findAll(this.store, { modelName: 'foo' });

  // Assert
  assert.deepEqual(result, []);
});

test('should track changes to list when not in FastBoot', async function(assert) {
  assert.expect(1);

  // Arrange
  const spy = sinon.spy(this.store, 'push');
  const adapter = this.subject({
    firebase: this.ref,
    findRecord: this.findRecord,
  });

  // Act
  await adapter.findAll(this.store, this.type);
  await this.ref.child('blogPosts/post_c').update({ 'message': 'Foo' });

  // Arrange
  assert.ok(spy.calledThrice);
});

test('should not track changes to list when in FastBoot', async function(assert) {
  assert.expect(1);

  // Arrange
  const spy = sinon.spy(this.store, 'push');
  const adapter = this.subject({
    firebase: this.ref,
    fastboot: EmberObject.create({ isFastBoot: true }),
    findRecord: this.findRecord,
  });

  // Act
  await adapter.findAll(this.store, this.type);
  await this.ref.child('blogPosts/post_c').update({ 'message': 'Foo' });

  // Arrange
  assert.ok(spy.notCalled);
});

moduleFor('adapter:firebase-flex', 'Unit | Adapter | firebase flex | deleteRecord', {
  needs: [ 'service:firebase' ],

  beforeEach() {
    stubFirebase();
    this.ref = createOfflineRef(getFixtureData());
    this.record = EmberObject.create({
      id: 'post_a',
      message: 'Post A',
      timestamp: 1483228800000,
      author: 'user_a',
      isSaving: false,
      adapterOptions: { include: { 'users/user_a': null } },
    });
    this.store = {
      normalize() {},
      peekRecord: sinon.stub().returns(this.record),
      push() {},
      unloadRecord: sinon.stub(),
    };
    this.type = { modelName: 'blog-post' };
  },

  afterEach() {
    unStubFirebase();
    destroyFirebaseApps();
  },
});

test('should remove from Firebase when deleting record', async function(assert) {
  assert.expect(1);

  // Arrange
  const spy = sinon.spy(this.ref, 'update');
  const adapter = this.subject({
    firebase: this.ref,
  });

  await adapter.findRecord(this.store, this.type, 'post_a');

  // Act
  await adapter.deleteRecord({}, { modelName: 'blog-post' }, this.record);

  // Assert
  assert.ok(spy.calledWith({ 'blogPosts/post_a': null, 'users/user_a': null }));
});

moduleFor('adapter:firebase-flex', 'Unit | Adapter | firebase flex | queryRecord', {
  needs: [ 'service:firebase' ],

  beforeEach() {
    stubFirebase();
    this.ref = createOfflineRef(getFixtureData());
    this.store = {};
    this.type = { modelName: 'blog-post' };
    this.post = { id: 'post_a' };
    this.findRecord = sinon.stub().returns(stubPromise(true, this.post));
  },

  afterEach() {
    unStubFirebase();
    destroyFirebaseApps();
  },
});

test('should return a single record that matches the equalTo query params', async function(assert) {
  assert.expect(1);

  // Arrange
  const adapter = this.subject({
    firebase: this.ref,
    findRecord: this.findRecord,
  });

  // Act
  const result = await adapter.queryRecord(this.store, this.type, {
    equalTo: 'post_a',
  });

  // Assert
  assert.deepEqual(result, this.post);
});

test('should return a single record that matches the startAt query params', async function(assert) {
  assert.expect(1);

  // Arrange
  const adapter = this.subject({
    firebase: this.ref,
    findRecord: this.findRecord,
  });

  // Act
  const result = await adapter.queryRecord(this.store, this.type, {
    startAt: 'post',
  });

  // Assert
  assert.deepEqual(result, this.post);
});

test('should return a single record that matches the endAt query params', async function(assert) {
  assert.expect(1);

  // Arrange
  const adapter = this.subject({
    firebase: this.ref,
    findRecord: this.findRecord,
  });

  // Act
  const result = await adapter.queryRecord(this.store, this.type, {
    endAt: 'post_a',
  });

  // Assert
  assert.deepEqual(result, this.post);
});

test('should return a single record even if limitToFirst query param is > 1', async function(assert) {
  assert.expect(1);

  // Arrange
  const adapter = this.subject({
    firebase: this.ref,
    findRecord: this.findRecord,
  });

  // Act
  const result = await adapter.queryRecord(this.store, this.type, {
    limitToFirst: 10,
  });

  // Assert
  assert.deepEqual(result, this.post);
});

test('should return a single record even if limitToLast query param is > 1', async function(assert) {
  assert.expect(1);

  // Arrange
  const adapter = this.subject({
    firebase: this.ref,
    findRecord: this.findRecord,
  });

  // Act
  const result = await adapter.queryRecord(this.store, this.type, {
    limitToLast: 10,
  });

  // Assert
  assert.deepEqual(result, this.post);
});

test('should return a single record that matches the path query params', async function(assert) {
  assert.expect(1);

  // Arrange
  const adapter = this.subject({
    firebase: this.ref,
    findRecord: this.findRecord,
  });

  // Act
  const result = await adapter.queryRecord(this.store, this.type, {
    path: 'userFeeds/user_a/',
  });

  // Assert
  assert.deepEqual(result, this.post);
});

test('should error when no record matches the query params', function(assert) {
  assert.expect(1);

  // Arrange
  const done = assert.async();
  const adapter = this.subject({
    firebase: this.ref,
    findRecord: this.findRecord,
  });

  run(() => {
    adapter.queryRecord(this.store, this.type, {
      equalTo: 'foo',
    }).catch((e) => {
      done();
      assert.ok(true);
    });
  });
});

moduleFor('adapter:firebase-flex', 'Unit | Adapter | firebase flex | query', {
  needs: [ 'service:firebase' ],

  beforeEach() {
    stubFirebase();
    this.ref = createOfflineRef(getFixtureData());
    this.recordArray = EmberObject.create({
      content: new A(),
      firebase: {
        next() {},
        off() {},
      },
      query: {},
      update() {},
    });
    this.type = { modelName: 'blog-post' };
    this.blogPosts = [{
      id: 'post_a',
      _internalModel: { id: 'post_a' },
    }, {
      id: 'post_b',
      _internalModel: { id: 'post_b' },
    }, {
      id: 'post_c',
      _internalModel: { id: 'post_c' },
    }];

    const storeFindRecordStub = sinon.stub();

    storeFindRecordStub.withArgs('blog-post', 'post_a').returns(stubPromise(
        true, this.blogPosts[0]));
    storeFindRecordStub.withArgs('blog-post', 'post_b').returns(stubPromise(
        true, this.blogPosts[1]));
    storeFindRecordStub.withArgs('blog-post', 'post_c').returns(stubPromise(
        true, this.blogPosts[2]));

    this.store = {
      findRecord: storeFindRecordStub,
    };

    const adapterFindRecordStub = sinon.stub();

    adapterFindRecordStub.withArgs(this.store, this.type, 'post_a').returns(
        stubPromise(true, this.blogPosts[0]));
    adapterFindRecordStub.withArgs(this.store, this.type, 'post_b').returns(
        stubPromise(true, this.blogPosts[1]));
    adapterFindRecordStub.withArgs(this.store, this.type, 'post_c').returns(
        stubPromise(true, this.blogPosts[2]));

    this.adapterFindRecord = adapterFindRecordStub;
  },

  afterEach() {
    unStubFirebase();
    destroyFirebaseApps();
  },
});

test('should return records that matches the equalTo query params', async function(assert) {
  assert.expect(1);

  // Arrange
  const adapter = this.subject({
    firebase: this.ref,
    findRecord: this.adapterFindRecord,
  });

  // Act
  const result = await adapter.query(this.store, this.type, {
    equalTo: 'post_a',
  }, this.recordArray);

  // Assert
  assert.deepEqual(result, [ this.blogPosts[0] ]);
});

test('should return records that matches the startAt query params', async function(assert) {
  assert.expect(1);

  // Arrange
  const adapter = this.subject({
    firebase: this.ref,
    findRecord: this.adapterFindRecord,
  });

  // Act
  const result = await adapter.query(this.store, this.type, {
    startAt: 'post',
  }, this.recordArray);

  // Assert
  assert.deepEqual(result, [ this.blogPosts[0], this.blogPosts[1] ]);
});

test('should return records that matches the endAt query params', async function(assert) {
  assert.expect(1);

  // Arrange
  const adapter = this.subject({
    firebase: this.ref,
    findRecord: this.adapterFindRecord,
  });

  // Act
  const result = await adapter.query(this.store, this.type, {
    endAt: 'post_a',
  }, this.recordArray);

  // Assert
  assert.deepEqual(result, [ this.blogPosts[0] ]);
});

test('should return records that matches the limitToFirst query params', async function(assert) {
  assert.expect(1);

  // Arrange
  const adapter = this.subject({
    firebase: this.ref,
    findRecord: this.adapterFindRecord,
  });

  // Act
  const result = await adapter.query(this.store, this.type, {
    limitToFirst: 1,
  }, this.recordArray);

  // Assert
  assert.deepEqual(result, [ this.blogPosts[0] ]);
});

test('should return records that matches the limitToLast query params', async function(assert) {
  assert.expect(1);

  // Arrange
  const adapter = this.subject({
    firebase: this.ref,
    findRecord: this.adapterFindRecord,
  });

  // Act
  const result = await adapter.query(this.store, this.type, {
    limitToLast: 1,
  }, this.recordArray);

  // Assert
  assert.deepEqual(result, [ this.blogPosts[1] ]);
});

test('should return records that matches the path query params', async function(assert) {
  assert.expect(1);

  // Arrange
  const adapter = this.subject({
    firebase: this.ref,
    findRecord: this.adapterFindRecord,
  });

  // Act
  const result = await adapter.query(this.store, this.type, {
    path: 'userFeeds/user_a',
  }, this.recordArray);

  // Assert
  assert.deepEqual(result, [ this.blogPosts[0], this.blogPosts[1] ]);
});

test('should return an empty array when no record matches the query params', async function(assert) {
  assert.expect(1);

  // Arrange
  const adapter = this.subject({
    firebase: this.ref,
    findRecord: this.adapterFindRecord,
  });

  // Act
  const result = await adapter.query(this.store, this.type, {
    equalTo: 'foo',
  }, this.recordArray);

  // Assert
  assert.deepEqual(result, []);
});

test('should listen for child_added changes when query params has cacheId and not in FastBoot', async function(assert) {
  assert.expect(1);

  // Arrange
  const adapter = this.subject({
    firebase: this.ref,
    findRecord: this.adapterFindRecord,
  });

  // Act
  await adapter.query(this.store, this.type, {
    cacheId: 'foo',
  }, this.recordArray);
  await this.ref.update({
    'blogPosts/post_c': {
      message: 'Post C',
      timestamp: 1483228800000,
      author: 'user_a',
    },
  });

  // Assert
  assert.deepEqual(this.recordArray.get('content'), [
    this.blogPosts[0]._internalModel,
    this.blogPosts[1]._internalModel,
    this.blogPosts[2]._internalModel,
  ]);
});

test('should not listen for child_added changes when query params has cacheId and in FastBoot', async function(assert) {
  assert.expect(1);

  // Arrange
  const adapter = this.subject({
    firebase: this.ref,
    fastboot: EmberObject.create({ isFastBoot: true }),
    findRecord: this.adapterFindRecord,
  });

  // Act
  await adapter.query(this.store, this.type, {
    cacheId: 'foo',
  }, this.recordArray);
  await this.ref.update({
    'blogPosts/post_c': {
      message: 'Post C',
      timestamp: 1483228800000,
      author: 'user_a',
    },
  });

  // Assert
  assert.deepEqual(this.recordArray.get('content'), []);
});

test('should listen for child_removed changes when query params has cacheId and not in FastBoot', async function(assert) {
  assert.expect(1);

  // Arrange
  const adapter = this.subject({
    firebase: this.ref,
    findRecord: this.adapterFindRecord,
  });

  // Act
  await adapter.query(this.store, this.type, {
    cacheId: 'foo',
  }, this.recordArray);
  await this.ref.update({ 'blogPosts/post_a': null });

  // Assert
  assert.deepEqual(this.recordArray.get('content'), [
    this.blogPosts[1]._internalModel,
  ]);
});

test('should not listen for child_removed changes when query params has cacheId and in FastBoot', async function(assert) {
  assert.expect(1);

  // Arrange
  const adapter = this.subject({
    firebase: this.ref,
    fastboot: EmberObject.create({ isFastBoot: true }),
    findRecord: this.adapterFindRecord,
  });

  // Act
  await adapter.query(this.store, this.type, {
    cacheId: 'foo',
  }, this.recordArray);
  await this.ref.update({ 'blogPosts/post_a': null });

  // Assert
  assert.deepEqual(this.recordArray.get('content'), []);
});

test('should increase limit when loading more records', async function(assert) {
  assert.expect(1);

  // Arrange
  const queryParams = {
    cacheId: 'foo',
    limitToFirst: 1,
  };

  this.recordArray.set('query', queryParams);

  const adapter = this.subject({
    firebase: this.ref,
    findRecord: this.adapterFindRecord,
  });

  // Act
  await adapter.query(this.store, this.type, queryParams, this.recordArray);
  await this.recordArray.get('firebase').next(1);

  // Assert
  assert.deepEqual(this.recordArray.get('query'), {
    cacheId: 'foo',
    limitToFirst: 2,
    orderBy: 'id',
  });
});

test('should re-query when loading more records', async function(assert) {
  assert.expect(1);

  // Arrange
  const stub = sinon.stub();

  this.recordArray.set('update', stub);

  const adapter = this.subject({
    firebase: this.ref,
    findRecord: this.adapterFindRecord,
  });

  // Act
  await adapter.query(this.store, this.type, {
    cacheId: 'foo',
    limitToFirst: 1,
  }, this.recordArray);
  await this.recordArray.get('firebase').next(1);

  // Assert
  assert.ok(stub.calledOnce);
});

test('should turn off existing query listener when re-querying it', async function(assert) {
  assert.expect(1);

  // Arrange
  const adapter = this.subject({
    firebase: this.ref,
    findRecord: this.adapterFindRecord,
  });

  await adapter.query(this.store, this.type, {
    cacheId: 'foo',
  }, this.recordArray);

  const spy = sinon.spy(this.recordArray.firebase, 'off');

  // Act
  await adapter.query(this.store, this.type, {
    cacheId: 'foo',
  }, this.recordArray);

  // Assert
  assert.ok(spy.calledOnce);
});
