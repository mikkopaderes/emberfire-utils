/* jshint node: true */
'use strict';

var Funnel = require('broccoli-funnel');
var featuresToExclude = [];
var assetsToExclude = [];

function filterAssets() {
  featuresToExclude.forEach(function(featureToExclude)  {
    if (featureToExclude === 'firebase-util') {
      assetsToExclude.push('**/firebase-util.js');
      assetsToExclude.push('**/has-limited.js');
    } else if (featureToExclude === 'firebase-ui') {
      assetsToExclude.push('**/firebase-ui*.js');
    }
  });
}

function isFeatureExcluded(feature) {
  if (featuresToExclude.indexOf(feature) !== -1) {
    return true;
  }

  return false;
}

module.exports = {
  name: 'emberfire-utils',
  options: {
    nodeAssets: {
      'firebaseui': function() {
        var imports = [ 'firebaseui.js', 'firebaseui.css' ];

        if (isFeatureExcluded('firebase-ui')) {
          imports = [];
        }

        return {
          srcDir: 'dist',
          import: imports,
        };
      },
    },
  },

  included: function(app) {
    var addonConfig = this.app.options[this.name];

    if (addonConfig) {
      featuresToExclude = addonConfig.exclude || [];
      filterAssets();
    }

    this._super.included.apply(this, arguments);

    if (!isFeatureExcluded('firebase-ui')) {
      app.import('vendor/shims/firebaseui.js');
    }
  },

  treeForApp: function() {
    var tree = this._super.treeForApp.apply(this, arguments);

    return new Funnel(tree, { exclude: assetsToExclude });
  },

  treeForAddon: function() {
    var tree = this._super.treeForAddon.apply(this, arguments);

    return new Funnel(tree, { exclude: assetsToExclude });
  },
};
