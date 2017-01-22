import RSVP from 'rsvp';
import run from 'ember-runloop';

/**
 * Stub promise
 *
 * @param {boolean} willResolve True if will resolve. Otherwise, false.
 * @param {*} dataToReturn Data to return when `willResolve` is true.
 * @return {Promise.<*>} Promise resolving to `dataToReturn`
 */
export default function stubPromise(willResolve, dataToReturn) {
  return new RSVP.Promise((resolve, reject) => {
    if (willResolve) {
      run(null, resolve, dataToReturn);
    } else {
      run(null, reject, dataToReturn);
    }
  });
}
