import Controller from 'ember-controller';
import inject from 'ember-service/inject';

import firebase from 'firebase';

export default Controller.extend({
  firebase: inject(),
  posts: null,
  newPost: null,

  async handleCreateRecordClick() {
    const store = this.get('store');
    const user = await store.findRecord('user', 'user_a');

    const newPost = store.createRecord('blog-post', {
      message: 'Foo',
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      author: user,
    });

    this.set('newPost', newPost);

    newPost.save({
      adapterOptions: {
        include: {
          'blogPosts/:id/author': 'user_a',
        },
      },
    });

    this._updatePosts();
  },

  async handleUpdateRecordClick() {
    const store = this.get('store');
    const post = await store.findRecord('blog-post', 'post_a');
    const user = await store.findRecord('user', 'user_b');

    post.set('message', 'Foo');
    post.set('author', user);
    post.save({
      adapterOptions: {
        include: {
          'blogPosts/post_a/author': user.get('id'),
        },
      },
    });
    this._updatePosts();
  },

  async handleFindRecordClick() {
    await this.get('store').findRecord('blog-post', 'post_a');

    this._updatePosts();
  },

  async handleFindAllClick() {
    const store = this.get('store');

    await store.findAll('user');
    await store.findAll('blog-post');

    this._updatePosts();
  },

  async handleDeleteRecordClick() {
    await this.get('newPost').destroyRecord();

    this._updatePosts();
  },

  async handleQueryRecordWithPathClick() {
    const store = this.get('store');

    await store.queryRecord('blog-post', {
      path: 'userFeeds/user_a',
      isReference: true,
      equalTo: 'post_a',
    });

    this._updatePosts();
  },

  async handleQueryRecordWithoutPathClick() {
    const store = this.get('store');

    await store.queryRecord('blog-post', {
      equalTo: 'post_a',
    });

    this._updatePosts();
  },

  async handleQueryWithPathClick() {
    const posts = await this.get('store').query('blog-post', {
      cacheId: 'cache-id',
      path: 'userFeeds/user_a',
      isReference: true,
      limitToFirst: 1,
    });

    this.set('posts', posts);
  },

  async handleQueryWithoutPathClick() {
    const posts = await this.get('store').query('blog-post', {
      cacheId: 'cache-id',
      limitToFirst: 1,
    });

    this.set('posts', posts);
  },

  async handleLoadMoreQueryRecordsClick() {
    this.get('posts.firebase').next(1);
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
      userFeeds: {
        user_a: {
          post_a: true,
          post_b: true,
        },
      },
      userPosts: {
        user_a: {
          post_a: true,
          post_b: true,
        },
      },
      users: {
        user_a: {
          name: 'User A',
        },
        user_b: {
          name: 'User B',
        },
      },
    };

    await this.get('firebase').update(fanout);
    this.get('store').unloadAll();
    this._updatePosts();
  },

  async _updatePosts() {
    const posts = await this.get('store').peekAll('blog-post');

    this.set('posts', posts);
  },
});
