/* jshint node: true */
'use strict';

var Funnel = require('broccoli-funnel');
var featuresToExclude = [];

function filterFeatures(addonConfig) {
  addonConfig.exclude.forEach((exclude) => {
    if (exclude === 'firebase-util') {
      featuresToExclude.push('**/firebase-util.js');
      featuresToExclude.push('**/has-limited.js');
    }
  });
}

module.exports = {
  name: 'emberfire-utils',

  included: function(app) {
    this._super.included.apply(this, arguments);

    var addonConfig = this.app.options[this.name];

    if (addonConfig) {
      filterFeatures(addonConfig);
    }
  },

  treeForApp: function() {
    var tree = this._super.treeForApp.apply(this, arguments);

    return new Funnel(tree, { exclude: featuresToExclude });
  },

  treeForAddon: function() {
    var tree = this._super.treeForAddon.apply(this, arguments);

    return new Funnel(tree, { exclude: featuresToExclude });
  },
};
