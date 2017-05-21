import Controller from 'ember-controller';
import inject from 'ember-service/inject';

export default Controller.extend({
  firebase: inject(),
  posts: null,
  newPost: null,

  async handleCreateRecordClick() {
    const store = this.get('store');
    const user = await store.findRecord('user', 'user_a');

    const newPost = store.createRecord('post', {
      message: 'Foo',
      timestamp: 12345,
      author: user,
    });

    this.set('newPost', newPost);

    newPost.save({
      include: {
        '/posts/$id/author': 'user_a',
      },
    });

    this._updatePosts();
  },

  async handleUpdateRecordClick() {
    const store = this.get('store');
    const post = await store.findRecord('post', 'post_a');
    const user = await store.findRecord('user', 'user_b');

    post.set('message', 'Foo');
    post.set('author', user);
    post.save({
      include: {
        '/posts/post_a/author': user.get('id'),
      },
    });
    this._updatePosts();
  },

  async handleFindRecordClick() {
    await this.get('store').findRecord('post', 'post_a');

    this._updatePosts();
  },

  async handleFindAllClick() {
    const store = this.get('store');

    await store.findAll('user');
    await store.findAll('post');

    this._updatePosts();
  },

  async handleDeleteRecordClick() {
    await this.get('newPost').destroyRecord();

    this._updatePosts();
  },

  async handleResetRecordsClick() {
    const fanout = {
      comments: {
        comment_a: {
          message: 'Comment A',
          timestamp: 12345,
          author: 'user_b',
        },
        comment_b: {
          message: 'Comment B',
          timestamp: 12345,
          author: 'user_b',
        },
      },
      postComments: {
        post_a: {
          comment_a: true,
          comment_b: true,
        },
      },
      posts: {
        post_a: {
          message: 'Post A',
          timestamp: 12345,
          author: 'user_a',
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
      },
    };

    await this.get('firebase').update(fanout);
    this.get('store').unloadAll();
    this._updatePosts();
  },

  async _updatePosts() {
    const posts = await this.get('store').peekAll('post');

    this.set('posts', posts);
  },
});
