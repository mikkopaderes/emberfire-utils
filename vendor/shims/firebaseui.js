(function() {
  function vendorModule() {
    'use strict';

    return { 'default': self['firebaseui'] };
  }

  define('firebaseui', [], vendorModule);
})();
