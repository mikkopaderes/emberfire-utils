import { moduleFor, test } from 'ember-qunit';

import sinon from 'sinon';

moduleFor('service:firebase-ui', 'Unit | Service | firebase ui', {
  // Specify the other units that are required for this test.
  // needs: ['service:foo']
});

test('should start auth UI', function(assert) {
  assert.expect(1);

  // Arrange
  let stub = sinon.stub();
  let service = this.subject({
    firebaseApp: { auth: sinon.stub() },
    ui: { start: stub },
  });

  // Act
  service.startAuthUi({ foo: 'bar' });

  // Assert
  assert.ok(stub.calledWithExactly(
      '#firebaseui-auth-container',
      { foo: 'bar' }));
});

test('should reset auth UI', function(assert) {
  assert.expect(1);

  // Arrange
  let stub = sinon.stub();
  let service = this.subject({
    firebaseApp: { auth: sinon.stub() },
    ui: { reset: stub },
  });

  // Act
  service.resetAuthUi();

  // Assert
  assert.ok(stub.calledOnce);
});
