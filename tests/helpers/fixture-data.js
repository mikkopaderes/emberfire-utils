/**
 * @return {Object} Fixture data
 */
export default function getFixtureData() {
  return {
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
      post_b: {
        message: 'Post B',
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
}
