import Controller from 'ember-controller';
import inject from 'ember-service/inject';

import firebase from 'firebase';

export default Controller.extend({
  firebase: inject(),
  comments: null,
  newComment: null,

  async handleCreateRecordClick() {
    const store = this.get('store');
    const user = await store.findRecord('user', 'user_a');

    const newComment = store.createRecord('comment', {
      message: 'Foo',
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      author: user,
    });

    this.set('newComment', newComment);

    newComment.save({
      adapterOptions: {
        path: 'comments/post_a',
        include: {
          'comments/post_a/:id/author': 'user_a',
        },
      },
    });

    this._updateComments();
  },

  async handleQueryRecordWithPathClick() {
    const store = this.get('store');

    await store.queryRecord('comment', {
      path: 'comments/post_a',
      equalTo: 'comment_a',
    });

    this._updateComments();
  },

  async handleQueryWithPathClick() {
    const comments = await this.get('store').query('comment', {
      cacheId: 'cache-id',
      path: 'comments/post_a',
      limitToFirst: 1,
    });

    this.set('comments', comments);
  },

  async handleLoadMoreQueryRecordsClick() {
    this.get('comments.firebase').next(1);
  },

  async handleResetRecordsClick() {
    const fanout = {
      blogPosts: {
        post_a: {
          message: 'Post A',
          timestamp: new Date().getTime(),
          author: 'user_a',
        },
        post_b: {
          message: 'Post B',
          timestamp: new Date().getTime(),
          author: 'user_a',
        },
      },
      comments: {
        post_a: {
          comment_a: {
            message: 'Comment A',
            timestamp: new Date().getTime(),
            author: 'user_b',
          },
          comment_b: {
            message: 'Comment B',
            timestamp: new Date().getTime(),
            author: 'user_b',
          },
        },
      },
      userFeeds: {
        user_a: {
          post_a: true,
          post_b: true,
        },
      },
      userPosts: {
        user_a: {
          post_a: true,
        },
      },
      users: {
        user_a: {
          name: 'User A',
        },
        user_b: {
          name: 'User B',
        },
        user_c: {
          name: 'User C',
        },
      },
    };

    await this.get('firebase').update(fanout);
    this.get('store').unloadAll();
    this._updateComments();
  },

  async _updateComments() {
    const comments = await this.get('store').peekAll('comment');

    this.set('comments', comments);
  },
});
