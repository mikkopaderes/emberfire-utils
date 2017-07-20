/**
 * @return {Object} Fixture data
 */
export default function getFixtureData() {
  return {
    blogPosts: {
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
    comments: {
      post_a: {
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
}
