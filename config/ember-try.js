/*jshint node:true*/
module.exports = {
  scenarios: [
    {
      name: 'default',
      bower: {
        dependencies: { }
      }
    },
    {
      name: 'ember-release',
      bower: {
        dependencies: {
          'ember': 'components/ember#release'
        },
        resolutions: {
          'ember': 'release'
        }
      }
    },
    {
      name: 'ember-beta',
      bower: {
        dependencies: {
          'ember': 'components/ember#beta'
        },
        resolutions: {
          'ember': 'beta'
        }
      }
    },
    {
      name: 'ember-canary',
      bower: {
        dependencies: {
          'ember': 'components/ember#canary'
        },
        resolutions: {
          'ember': 'canary'
        }
      }
    },
    {
      name: 'ember-data-release',
      bower: {
        dependencies: {
          'ember-data': 'components/ember-data#release'
        },
        resolutions: {
          'ember-data': 'release'
        }
      }
    },
    {
      name: 'ember-data-beta',
      bower: {
        dependencies: {
          'ember-data': 'components/ember-data#beta'
        },
        resolutions: {
          'ember-data': 'beta'
        }
      }
    },
    {
      name: 'ember-data-canary',
      bower: {
        dependencies: {
          'ember-data': 'components/ember-data#canary'
        },
        resolutions: {
          'ember-data': 'canary'
        }
      }
    }
  ]
};
