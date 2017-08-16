import { test } from 'qunit';
import moduleForAcceptance from '../../tests/helpers/module-for-acceptance';

const postId = '[data-test="post-id"]';
const postMessage = '[data-test="post-message"]';
const postTimestamp = '[data-test="post-timestamp"]';
const postAuthor = '[data-test="post-author"]';
const updateRecordButton = '[data-test="update-record-button"]';

moduleForAcceptance('Acceptance | update record');

test('should update record', function(assert) {
  assert.expect(4);

  // Act
  visit('/posts');
  click(updateRecordButton);

  // Assert
  andThen(() => {
    assert.equal(find(postId).text().trim(), 'post_a');
    assert.equal(find(postMessage).text().trim(), 'Foo');
    assert.equal(find(postTimestamp).text().trim(), new Date('2017-01-01'));
    assert.equal(find(postAuthor).text().trim(), 'User B');
  });
});
