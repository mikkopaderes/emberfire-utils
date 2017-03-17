module.exports = {
  description: ''

  afterInstall: function() {
    return this.addPackagesToProject([ { name: 'firebaseui' } ]);
  },
};
