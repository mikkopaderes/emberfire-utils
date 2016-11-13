import RSVP from 'rsvp';
import run, { later } from 'ember-runloop';

export default function stubPromise(willResolve, dataToReturn) {
  return new RSVP.Promise((resolve, reject) => {
    if (willResolve) {
      later(() => run(null, resolve, dataToReturn), 0);
    } else {
      later(() => run(null, reject, dataToReturn), 0);
    }
  });
}
