import { moduleForComponent, test } from 'ember-qunit';
import Service from 'ember-service';
import hbs from 'htmlbars-inline-precompile';

import sinon from 'sinon';

moduleForComponent('firebase-ui-auth', 'Integration | Component | firebase ui auth', {
  integration: true,
});

test('should render firebase ui auth widget', function(assert) {
  assert.expect(1);

  // Arrange
  let startAuthUiStub = sinon.stub();
  let firebaseUiStub = Service.extend({
    startAuthUi: startAuthUiStub,
    resetAuthUi: sinon.stub(),
  });

  this.register('service:firebase-ui', firebaseUiStub);
  this.inject.service('firebase-ui', { as: 'firebaseUi' });
  this.set('uiConfig', { foo: 'bar' });

  // Act
  this.render(hbs`{{firebase-ui-auth uiConfig=uiConfig}}`);

  // Assert
  assert.ok(startAuthUiStub.calledWithExactly(this.get('uiConfig')));
});
