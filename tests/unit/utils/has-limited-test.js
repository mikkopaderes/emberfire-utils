import { module, test } from 'qunit';
import EmberObject from 'ember-object';
import wait from 'ember-test-helpers/wait';

import sinon from 'sinon';

import hasLimited from 'dummy/utils/has-limited';
import stubPromise from 'dummy/tests/helpers/stub-promise';

module('Unit | Utility | has limited');

test('should return a computed promise array when calling hasLimited', function(assert) {
  assert.expect(1);

  // Arrange
  const EXPECTED = [{
    id: 'xfoo',
    value: 'foo',
  }, {
    id: 'ydee',
    value: 'dee',
  }, {
    id: 'zbar',
    value: 'bar',
  }];
  let EO = EmberObject.extend({
    firebaseUtil: { query: sinon.stub().returns(stubPromise(true, EXPECTED)) },
    foo: hasLimited('model', 'id', 'usernames'),
  });
  let object = EO.create();

  // Act
  let promiseArray = object.get('foo');

  // Assert
  return wait().then(() => {
    let actual = promiseArray.get('content');

    assert.equal(actual, EXPECTED);
  });
});
