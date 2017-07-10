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
const queryWithPathButton = '[data-test="query-with-path-button"]';
const queryWithoutPathButton = '[data-test="query-without-path-button"]';
const loadMoreRecordsButton = '[data-test="load-more-query-records-button"]';

moduleForAcceptance('Acceptance | query');

test('should query records with path as reference to model', function(assert) {
  assert.expect(4);

  // Act
  visit('/posts');
  click(queryWithPathButton);

  // Assert
  andThen(() => {
    assert.equal(find(postId).text().trim(), 'post_a');
    assert.equal(find(postMessage).text().trim(), 'Post A');
    assert.equal(find(postTimestamp).text().trim(), '12345');
    assert.equal(find(postAuthor).text().trim(), 'User A');
  });
});

test('should query records with path as direct representation of model', function(assert) {
  assert.expect(4);

  // Act
  visit('/comments');
  click(queryWithPathButton);

  // Assert
  andThen(() => {
    assert.equal(find(commentId).text().trim(), 'comment_a');
    assert.equal(find(commentMessage).text().trim(), 'Comment A');
    assert.equal(find(commentTimestamp).text().trim(), '12345');
    assert.equal(find(commentAuthor).text().trim(), 'User B');
  });
});

test('should query records without path', function(assert) {
  assert.expect(4);

  // Act
  visit('/posts');
  click(queryWithoutPathButton);

  // Assert
  andThen(() => {
    assert.equal(find(postId).length, 1);
    assert.equal(find(postMessage).length, 1);
    assert.equal(find(postTimestamp).length, 1);
    assert.equal(find(postAuthor).length, 1);
  });
});

test('should load more records with path as reference to model', function(assert) {
  assert.expect(4);

  // Act
  visit('/posts');
  click(queryWithPathButton);
  click(loadMoreRecordsButton);

  // Assert
  andThen(() => {
    assert.equal(find(postId).length, 2);
    assert.equal(find(postMessage).length, 2);
    assert.equal(find(postTimestamp).length, 2);
    assert.equal(find(postAuthor).length, 2);
  });
});

test('should load more records with path as direct representation of model', function(assert) {
  assert.expect(4);

  // Act
  visit('/comments');
  click(queryWithPathButton);
  click(loadMoreRecordsButton);

  // Assert
  andThen(() => {
    assert.equal(find(commentId).length, 2);
    assert.equal(find(commentMessage).length, 2);
    assert.equal(find(commentTimestamp).length, 2);
    assert.equal(find(commentAuthor).length, 2);
  });
});

test('should load more records without path', function(assert) {
  assert.expect(4);

  // Act
  visit('/posts');
  click(queryWithoutPathButton);
  click(loadMoreRecordsButton);

  // Assert
  andThen(() => {
    assert.equal(find(postId).length, 2);
    assert.equal(find(postMessage).length, 2);
    assert.equal(find(postTimestamp).length, 2);
    assert.equal(find(postAuthor).length, 2);
  });
});
