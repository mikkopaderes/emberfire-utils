import { test } from 'qunit';
import moduleForAcceptance from '../../tests/helpers/module-for-acceptance';

const postId = '[data-test="post-id"]';
const postMessage = '[data-test="post-message"]';
const postTimestamp = '[data-test="post-timestamp"]';
const postAuthor = '[data-test="post-author"]';
const findRecordButton = '[data-test="find-record-button"]';

moduleForAcceptance('Acceptance | find record');

test('should display record when fetched', function(assert) {
  assert.expect(4);

  // Act
  visit('/posts');
  click(findRecordButton);

  // Assert
  andThen(() => {
    assert.equal(find(postId).text().trim(), 'post_a');
    assert.equal(find(postMessage).text().trim(), 'Post A');
    assert.equal(find(postTimestamp).text().trim(), new Date('2017-01-01'));
    assert.equal(find(postAuthor).text().trim(), 'User A');
  });
});
