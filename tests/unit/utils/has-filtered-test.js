import { module, test } from 'qunit';
import EmberObject from 'ember-object';
import wait from 'ember-test-helpers/wait';

import sinon from 'sinon';

import hasFiltered from 'dummy/utils/has-filtered';
import stubPromise from 'dummy/tests/helpers/stub-promise';

module('Unit | Utility | has filtered');

test('should return a computed promise array when calling hasFiltered', function(assert) {
  assert.expect(2);

  // Arrange
  const adapterForStub = sinon.stub().returns(EmberObject.create({
    innerReferencePathName: 'innerReferencePath',
  }));
  const queryResult = [{
    id: 'xfoo',
    value: 'foo',
  }, {
    id: 'ydee',
    value: 'dee',
  }, {
    id: 'zbar',
    value: 'bar',
  }];
  const queryStub = sinon.stub().returns(stubPromise(true, queryResult));
  const EO = EmberObject.extend({
    store: { adapterFor: adapterForStub, query: queryStub },

    id: 'lala',
    innerReferencePath: 'land',

    foo: hasFiltered('model', {
      cacheId: 'foo_:id',
      path: 'foo_:id_bar_:innerReferencePath',
    }),
  });
  const object = EO.create();

  // Act
  const promiseArray = object.get('foo');

  // Assert
  return wait().then(() => {
    const result = promiseArray.get('content');

    assert.ok(queryStub.calledWithExactly('model', {
      cacheId: 'foo_lala',
      path: 'foo_lala_bar_land',
    }));
    assert.equal(result, queryResult);
  });
});
