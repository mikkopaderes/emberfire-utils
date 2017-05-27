import { test } from 'qunit';
import moduleForAcceptance from '../../tests/helpers/module-for-acceptance';

const postId = '[data-test="post-id"]';
const postMessage = '[data-test="post-message"]';
const postAuthor = '[data-test="post-author"]';
const createRecordButton = '[data-test="create-record-button"]';

moduleForAcceptance('Acceptance | create record');

test('should create record', function(assert) {
  assert.expect(3);

  // Act
  visit('/');
  click(createRecordButton);

  // Assert
  andThen(() => {
    assert.equal(find(postId).length, 1);
    assert.equal(find(postMessage).text().trim(), 'Foo');
    assert.equal(find(postAuthor).text().trim(), 'User A');
  });
});
