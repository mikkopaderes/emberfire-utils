import { test } from 'qunit';
import moduleForAcceptance from '../../tests/helpers/module-for-acceptance';

const postId = '[data-test="post-id"]';
const postMessage = '[data-test="post-message"]';
const postTimestamp = '[data-test="post-timestamp"]';
const postAuthor = '[data-test="post-author"]';
const createRecordButton = '[data-test="create-record-button"]';

moduleForAcceptance('Acceptance | create record');

test('should create record', function(assert) {
  assert.expect(4);

  // Act
  visit('/');
  click(createRecordButton);

  // Assert
  andThen(() => {
    assert.equal(find(postId).length, 1);
    assert.equal(find(postMessage).text().trim(), 'Foo');
    assert.equal(find(postTimestamp).text().trim(), '12345');
    assert.equal(find(postAuthor).text().trim(), 'User A');
  });
});
