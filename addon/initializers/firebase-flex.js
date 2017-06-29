/** @module emberfire-utils */
import FirebaseFlexSerializer from '../serializers/firebase-flex';

/**
 * Firebase Flex initializer
 *
 * @param {Object} application
 */
export function initialize(application) {
  application.register('serializer:-firebase-flex', FirebaseFlexSerializer);
}

export default {
  name: 'firebase-flex',
  initialize,
};
