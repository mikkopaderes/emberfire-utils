import { moduleForModel, test } from 'ember-qunit';

moduleForModel('blog-post', 'Unit | Serializer | firebase flex', {
  needs: [ 'model:user', 'serializer:application' ],
});

test('should serialize record to Firebase fanout', function(assert) {
  assert.expect(1);

  // Arrange
  const post = this.subject({
    id: 'post_a',
    message: 'Post',
    timestamp: 12345,
  });

  // Act
  const serializedRecord = post.serialize();

  // Assert
  assert.deepEqual(serializedRecord, {
    '/blogPosts/post_a/message': 'Post',
    '/blogPosts/post_a/timestamp': 12345,
  });
});
