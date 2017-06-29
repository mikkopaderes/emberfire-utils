import { test } from 'qunit';
import moduleForAcceptance from '../../tests/helpers/module-for-acceptance';

const postId = '[data-test="post-id"]';
const postMessage = '[data-test="post-message"]';
const postTimestamp = '[data-test="post-timestamp"]';
const postAuthor = '[data-test="post-author"]';
const createRecordButton = '[data-test="create-record-button"]';
const deleteRecordButton = '[data-test="delete-record-button"]';

moduleForAcceptance('Acceptance | delete record');

test('should delete record', function(assert) {
  assert.expect(5);

  // Act
  visit('/posts');
  click(createRecordButton);

  // Assert
  andThen(() => {
    assert.equal(find(postId).length, 1);
  });

  // Act
  click(deleteRecordButton);

  // Assert
  andThen(() => {
    assert.equal(find(postId).length, 0);
    assert.equal(find(postMessage).length, 0);
    assert.equal(find(postTimestamp).length, 0);
    assert.equal(find(postAuthor).length, 0);
  });
});
