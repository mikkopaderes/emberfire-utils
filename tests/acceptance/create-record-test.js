import { test } from 'qunit';
import moduleForAcceptance from '../../tests/helpers/module-for-acceptance';

const postId = '[data-test="post-id"]';
const postMessage = '[data-test="post-message"]';
const postAuthor = '[data-test="post-author"]';
const commentId = '[data-test="comment-id"]';
const commentMessage = '[data-test="comment-message"]';
const commentAuthor = '[data-test="comment-author"]';
const createRecordButton = '[data-test="create-record-button"]';

moduleForAcceptance('Acceptance | create record');

test('should create record without path', function(assert) {
  assert.expect(3);

  // Act
  visit('/posts');
  click(createRecordButton);

  // Assert
  andThen(() => {
    assert.equal(find(postId).length, 1);
    assert.equal(find(postMessage).text().trim(), 'Foo');
    assert.equal(find(postAuthor).text().trim(), 'User A');
  });
});

test('should create record with path', function(assert) {
  assert.expect(3);

  // Act
  visit('/comments');
  click(createRecordButton);

  // Assert
  andThen(() => {
    assert.equal(find(commentId).length, 1);
    assert.equal(find(commentMessage).text().trim(), 'Foo');
    assert.equal(find(commentAuthor).text().trim(), 'User A');
  });
});
