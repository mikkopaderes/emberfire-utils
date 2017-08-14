import { test } from 'qunit';
import moduleForAcceptance from '../../tests/helpers/module-for-acceptance';

const postId = '[data-test="post-id"]';
const postMessage = '[data-test="post-message"]';
const postTimestamp = '[data-test="post-timestamp"]';
const postAuthor = '[data-test="post-author"]';
const commentId = '[data-test="comment-id"]';
const commentMessage = '[data-test="comment-message"]';
const commentTimestamp = '[data-test="comment-timestamp"]';
const commentAuthor = '[data-test="comment-author"]';
const queryRecordWithPathButton = '[data-test="query-record-with-path-button"]';
const queryRecordWithoutPathButton =
    '[data-test="query-record-without-path-button"]';

moduleForAcceptance('Acceptance | query record');

test('should query record with path as reference to model', function(assert) {
  assert.expect(4);

  // Act
  visit('/posts');
  click(queryRecordWithPathButton);

  // Assert
  andThen(() => {
    assert.equal(find(postId).text().trim(), 'post_a');
    assert.equal(find(postMessage).text().trim(), 'Post A');
    assert.equal(find(postTimestamp).text().trim(), new Date('2017-01-01'));
    assert.equal(find(postAuthor).text().trim(), 'User A');
  });
});

test('should query record with path as direct representation of model', function(assert) {
  assert.expect(4);

  // Act
  visit('/comments');
  click(queryRecordWithPathButton);

  // Assert
  andThen(() => {
    assert.equal(find(commentId).text().trim(), 'comment_a');
    assert.equal(find(commentMessage).text().trim(), 'Comment A');
    assert.equal(find(commentTimestamp).text().trim(), new Date('2017-01-01'));
    assert.equal(find(commentAuthor).text().trim(), 'User B');
  });
});

test('should query record without path', function(assert) {
  assert.expect(4);

  // Act
  visit('/posts');
  click(queryRecordWithoutPathButton);

  // Assert
  andThen(() => {
    assert.equal(find(postId).text().trim(), 'post_a');
    assert.equal(find(postMessage).text().trim(), 'Post A');
    assert.equal(find(postTimestamp).text().trim(), new Date('2017-01-01'));
    assert.equal(find(postAuthor).text().trim(), 'User A');
  });
});
