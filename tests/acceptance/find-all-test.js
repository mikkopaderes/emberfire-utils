import { test } from 'qunit';
import moduleForAcceptance from '../../tests/helpers/module-for-acceptance';

const postId = '[data-test="post-id"]';
const postMessage = '[data-test="post-message"]';
const postTimestamp = '[data-test="post-timestamp"]';
const postAuthor = '[data-test="post-author"]';
const findAllButton = '[data-test="find-all-button"]';

moduleForAcceptance('Acceptance | find all');

test('should find all records', function(assert) {
  assert.expect(4);

  // Act
  visit('/posts');
  click(findAllButton);

  // Assert
  andThen(() => {
    assert.equal(find(postId).length, 2);
    assert.equal(find(postMessage).length, 2);
    assert.equal(find(postTimestamp).length, 2);
    assert.equal(find(postAuthor).length, 2);
  });
});
