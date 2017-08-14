import { moduleForModel, test } from 'ember-qunit';

import firebase from 'firebase';

moduleForModel('blog-post', 'Unit | Serializer | firebase flex', {
  needs: [ 'model:user', 'serializer:application', 'transform:timestamp' ],
});

test('should serialize record to Firebase fanout', function(assert) {
  assert.expect(1);

  // Arrange
  const post = this.subject({
    id: 'post_a',
    message: 'Post',
    timestamp: firebase.database.ServerValue.TIMESTAMP,
  });

  // Act
  const serializedRecord = post.serialize();

  // Assert
  assert.deepEqual(serializedRecord, {
    'blogPosts/post_a/message': 'Post',
    'blogPosts/post_a/timestamp': firebase.database.ServerValue.TIMESTAMP,
  });
});

test('should remove inner reference path from fanout', function(assert) {
  assert.expect(1);

  // Arrange
  const post = this.subject({
    id: 'post_a',
    message: 'Post',
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    innerReferencePath: 'post_a',
  });

  // Act
  const serializedRecord = post.serialize({
    innerReferencePathName: 'innerReferencePath',
  });

  // Assert
  assert.deepEqual(serializedRecord, {
    'blogPosts/post_a/message': 'Post',
    'blogPosts/post_a/timestamp': firebase.database.ServerValue.TIMESTAMP,
  });
});
