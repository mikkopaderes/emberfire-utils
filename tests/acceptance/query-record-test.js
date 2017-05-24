import { test } from 'qunit';
import moduleForAcceptance from '../../tests/helpers/module-for-acceptance';

const postId = '[data-test="post-id"]';
const postMessage = '[data-test="post-message"]';
const postTimestamp = '[data-test="post-timestamp"]';
const postAuthor = '[data-test="post-author"]';
const queryRecordWithPathButton = '[data-test="query-record-with-path-button"]';
const queryRecordWithoutPathButton =
    '[data-test="query-record-without-path-button"]';

moduleForAcceptance('Acceptance | query record');

test('should query record with path', function(assert) {
  assert.expect(4);

  // Act
  visit('/');
  click(queryRecordWithPathButton);

  // Assert
  andThen(() => {
    assert.equal(find(postId).text().trim(), 'post_a');
    assert.equal(find(postMessage).text().trim(), 'Post A');
    assert.equal(find(postTimestamp).text().trim(), '12345');
    assert.equal(find(postAuthor).text().trim(), 'User A');
  });
});

test('should query record without path', function(assert) {
  assert.expect(4);

  // Act
  visit('/');
  click(queryRecordWithoutPathButton);

  // Assert
  andThen(() => {
    assert.equal(find(postId).text().trim(), 'post_a');
    assert.equal(find(postMessage).text().trim(), 'Post A');
    assert.equal(find(postTimestamp).text().trim(), '12345');
    assert.equal(find(postAuthor).text().trim(), 'User A');
  });
});
