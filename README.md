# EmberFire Utilities

This addon provides some useful utilities on top of [EmberFire](https://github.com/firebase/emberfire).

## Installation

```bash
ember install emberfire-utils
```

> Your app needs to have EmberFire installed for this addon to work.

## Features

* [Flexible Adapter and Serializer](#flexible-adapter-and-serializer)
  * [Save and delete records with fan-out](#save-and-delete-records-with-fan-out)
  * [Save records with path](#save-records-with-path)
  * [Update only the changed attributes of a record](#update-only-the-changed-attributes-of-a-record)
  * [Query records with path and infinite scrolling](#query-records-with-path-and-infinite-scrolling)
* [`hasFiltered` relationship](#hasfiltered-relationship-not-really-a-relationship)
* [Utility Service](#utility-service)
  * [Multi-path updates](#multi-path-updates)
  * [Storage manipulations](#storage-manipulations)
  * [Queries for non-model data](#queries-for-non-model-data)
* [FirebaseUI Component](#firebaseui)

## Configuration

You can optionally specify what libraries you'd want to exclude in your build within your `ember-cli-build.js`.
Here's how:

```javascript
var app = new EmberApp(defaults, {
  'emberfire-utils': {
    exclude: [ 'firebase-flex', 'firebase-util', 'firebase-ui' ],
  },
});
```

> Possible exclusions are `firebase-flex`, `firebase-util`, and `firebase-ui`.

## Flexible Adapter and Serializer

This is a standard Ember Data adapter that supports: `createRecord()`, `destroyRecord()`, `findRecord()`, `findAll()`, `queryRecord()`, and `query()`. However, its extended to allow some power features that's available to Firebase users.

### Usage

Setup your application adapter like this:

```javascript
// app/adapters/application.js
import FirebaseFlexAdapter from 'emberfire-utils/adapters/firebase-flex';

export default FirebaseFlexAdapter.extend();
```

### Save and delete records with fan-out

```javascript
// Saving a new record with fan-out
this.get('store').createRecord('post', {
  title: 'Foo',
  message: 'Bar'
}).save({
  adapterOptions: {
    include: {
      '/userFeeds/user_a/$id': true,
      '/userFeeds/user_b/$id': true,
    }
  }
});

// Deleting a record with fan-out
this.get('store').findRecord('post', 'post_a').then((post) => {
  post.deleteRecord();
  post.save({
    adapterOptions: {
      include: {
        '/userFeeds/user_a/post_a': null,
        '/userFeeds/user_b/post_a': null,
      }
    }
  });
});

// Alternatively, you can use `destroyRecord` with fan-out too
this.get('store').findRecord('post', 'post_a').then((post) => {
  post.destroyRecord({
    adapterOptions: {
      include: {
        '/userFeeds/user_a/post_a': null,
        '/userFeeds/user_b/post_a': null,
      }
    }
  });
});
```

> Notice the `$id`. It's a keyword that will be replaced by the model's ID.

### Save records with path

```javascript
this.get('store').createRecord('comment', {
  title: 'Foo',
  message: 'Bar'
}).save({
  adapterOptions: { path: 'comments/post_a' }
});
```

### Update only the changed attributes of a record

By default, only the changed attributes will be updated in Firebase whenever we call `save()`. This way, we can now have rules that doesn't allow some attributes to be edited.

### Query records with path and infinite scrolling

The query params here uses the same format as the one in [EmberFire](https://github.com/firebase/emberfire/blob/master/docs/guide/querying-data.md) with the addition of supporting the following:

* `orderBy: '.value'`.
* `path` to query the data from
* `isReference` to know if the `path` is just a reference to a model in a different node (see example below)
* `cacheId` to prevent duplicate listeners and make the query result array update in realtime
  * Without `cacheId`, the query result array won't listen for `child_added` or `child_removed` changes. However, the models that are already inside of it will still update in realtime.
  * `cacheId` isn't available in `queryRecord`.

#### With path

Let's assume the following data structure.

```json
{
  "chats": {
    "one": {
      "title": "Historical Tech Pioneers",
      "lastMessage": "ghopper: Relay malfunction found. Cause: moth.",
      "timestamp": 1459361875666
    },
    "two": { ... },
    "three": { ... }
  },

  "members": {
    "one": {
      "ghopper": true,
      "alovelace": true,
      "eclarke": true
    },
    "two": { ... },
    "three": { ... }
  },

  "messages": {
    "one": {
      "m1": {
        "name": "eclarke",
        "message": "The relay seems to be malfunctioning.",
        "timestamp": 1459361875337
      },
      "m2": { ... },
      "m3": { ... }
    },
    "two": { ... },
    "three": { ... }
  },

  "users": {
    "ghopper": { ... },
    "alovelace": { ... },
    "eclarke": { ... }
  }
}
```

To fetch the chat members, you need to set the `path` and `isReference`. The `isReference` boolean indicates that the nodes under `members/one` are simply references to the `user` model which is represented by the `users` node.

```javascript
this.get('store').query('user', {
  path: 'members/one',
  isReference: true,
  limitToFirst: 10
});
```

To fetch the chat messages, you just need to set the `path` and leave out the `isReference`. Without the `isReference` boolean, it indicates that the `messages/one/m1`, `messages/one/m2`, etc. are a direct representation of the `message` model.

```javascript
this.get('store').query('message', {
  path: 'messages/one',
  limitToFirst: 10
});
```

#### With cacheId

```javascript
this.get('store').query('post', {
  cacheId: 'my_cache_id',
  limitToFirst: 10
});
```

#### Infinite scrolling

```javascript
this.get('store').query('post', {
  limitToFirst: 10
}).then((posts) => {
  posts.get('firebase').next(10);
});
```

### Caveats

#### Relationship won't get updated when firing `save()` ####

As explained above, only the changed attributes will be saved when we call it. Ember Data currently doesn't provide a way to check if a relationship has changed. As a workaround, we need to fan-out the relationship to save it.

e.g.

```javascript
const store = this.get('store');

store.findRecord('post', 'another_user').then((user) => {
  this.get('store').findRecord('post', 'post_a').then((post) => {
    post.set('author', user);
    post.save({
      adapterOptions: {
        include: {
          'posts/post_a/author': 'another_user'
        }
      }
    });
  });
});
```

However, there's a good side to this. Now we can provide different values to those relationships rather than the default `true` value in EmberFire.

## `hasFiltered` relationship (not really a relationship)

Most of the time, we don't want to use the `hasMany()` relationship in our models because:

1. It's not flexible enough to fetch from paths we want.
2. It loads all the data when we access it.
3. Even if we don't access it, those array of IDs are still taking up internet data usage.

To solve those 2 problems above, use `hasFiltered()` relationship. It has the same parameters as `store.query()` and it also works with infinite scrolling as explained above.

```javascript
// app/models/user
import Model from 'ember-data/model';
import attr from 'ember-data/attr';

import hasFiltered from 'emberfire-utils/utils/has-filtered';

export default Model.extend({
  photoURL: attr('string'),
  username: attr('string'),
  posts: hasFiltered('post', {
    path: 'userFeeds/$id',
    cacheId: '$id_posts',
    limitToFirst: 10,
  })
});

```

Notice the `$id`. It's a keyword that will be replaced by the model's ID.

> `hasFiltered()` are read only.

## Utility Service

### Usage

Simply inject the `firebase-util` service.

### Multi-path updates

To write on multiple paths atomically in Firebase, call `update()`.

```javascript
const fanoutObject = {};

fanoutObject['users/foo/firstName'] = 'Foo';
fanoutObject['users/bar/firstName'] = 'Bar';

this.get('firebaseUtil').update(fanoutObject).then(() => {
  // Do something after a succesful update
}).catch(error => {
  // Do something with `error`
});
```

#### Generate Firebase push ID

Should you need to generate a Firebase push ID for your multi-path updates, you can use `generateIdForRecord()`. This returns a unique ID generated by Firebase's [`push()`](https://firebase.google.com/docs/database/admin/save-data#getting-the-unique-key-generated-by-push) method.

```javascript
const pushId = this.get('firebaseUtil').generateIdForRecord('comments/post_a');
```

### Storage manipulations

#### Uploading a file to Firebase Storage

To upload files in Firebase storage, call `uploadFile()`.

```javascript
function onStateChange(snapshot) {
  const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

  console.log('Upload is ' + progress + '% done');
}

this.get('firebaseUtil').uploadFile('images/foo.jpg', file, metadata, onStateChange).then(downloadURL => {
  // Do something with `downloadURL`
}).catch(error => {
  // Do something with `error`
});
```

* `file` should be a `Blob` or a `Uint8Array`.
* `metadata` and `onStateChange` are optional params.

#### Deleting a file in Firebase Storage

To delete files in Firebase storage, call `deleteFile()`.

```javascript
this.get('firebaseUtil').deleteFile(url).then(() => {
  // Do something on success
}).catch(error => {
  // Do something with `error`
});
```

> `url` should be the HTTPS URL representation of the file.
> e.g. https://firebasestorage.googleapis.com/b/bucket/o/images%20stars.jpg

### Queries for non-model data

For the examples below, assume we have the following Firebase data:

```json
{
  "users" : {
    "foo" : {
      "photoURL" : "foo.jpg",
      "username" : "bar"
    },
    
    "hello" : {
      "photoURL" : "hello.jpg",
      "username" : "world"
    }
  }
}
```

#### Query a single record

To query a single record, call `queryRecord()`. This will return a promise that fulfills with the requested record in a plain object format.

```javascript
this.get('firebaseUtil').queryRecord('users', { equalTo: 'foo' }).then((record) => {
  // Do something with `record`
}).catch(error => {
  // Do something with `error`
});
```

Params:

- `path` - Firebase path
- `options` - An object that can contain the following:
  - `cacheId` - Prevents duplicate listeners and returns cached record if it already exists. When not provided, Firebase won't listen for changes returned by this function.
  - [EmberFire](https://github.com/firebase/emberfire/blob/master/docs/guide/querying-data.md) queries with the addition of `.value` for `orderBy` and forcing of `limitToFirst` or `limitToLast` to 1.

> `limitToFirst` and `limitToLast` is forced to 1 because this method will only return a single record. If you provided an option of `limitToFirst`, it will set it to 1 regardless of the value that you've set. Same goes for `limitToLast` respectively.

#### Query multiple records

To query for multiple records, call `query()`. This will return a promise that fulfills with the requested records; each one in a plain object format.

```javascript
this.get('firebaseUtil').query('users', { limitToFirst: 10 }).then((records) => {
  // Do something with `records`
}).catch(error => {
  // Do something with `error`
});
```

Params:

- `path` - Firebase path
- `options` - An object that can contain the following:
  - `cacheId` - Prevents duplicate listeners and returns cached record if it already exists. When not provided, Firebase won't listen for changes returned by this function.
  - [EmberFire](https://github.com/firebase/emberfire/blob/master/docs/guide/querying-data.md) queries with the addition of `.value` for `orderBy`.

##### Serialized to plain objects

For `queryRecord()` and `query()`, the records are serialized in plain object. For the `queryRecord()` example 
above, the record will be serialized to:

```javascript
record = {
  id: 'foo',
  photoURL: 'foo.jpg',
  username: 'bar'
};
```

For `findAll()`:

```javascript
records = [{
  id: 'foo',
  photoURL: 'foo.jpg',
  username: 'bar'
}, {
  id: 'hello',
  photoURL: 'hello.jpg',
  username: 'world'
}];
```

Should we retrieve a record who's value isn't an object (e.g. `users/foo/username`), the record will be 
serialized to:

```javascript
record = {
  id: 'username',
  value: 'bar'
};
```

##### Loading more records for `query()`

To load more records in the `query()` result, call `next()`.

```javascript
const firebaseUtil = this.get('firebaseUtil');

firebaseUtil.query('users', {
  cacheId: 'cache_id',
  limitToFirst: 10,
}).then(() => {
  firebaseUtil.next('cache_id', 10);
});
```

### Checking if record exists

To check if a record exists, call `isRecordExisting()`. This returns a promise that fulfills to `true` if the record exists. Otherwise, `false`.

```javascript
this.get('firebaseUtil').isRecordExisting('users/foo').then((result) => {
  // Do something with `result`
}).catch(error => {
  // Do something with `error`
});
```

### [FirebaseUI](https://github.com/firebase/firebaseui-web)

#### Auth

A component is provided for rendering FirebaseUI Auth. Here's how:

First setup your `uiConfig` which is exactly the same with [Firebase UI Auth](https://github.com/firebase/firebaseui-web#configuration).

```javascript
import firebase from 'firebase';
import firebaseui from 'firebaseui';

let uiConfig = {
  credentialHelper: firebaseui.auth.CredentialHelper.NONE,
  signInSuccessUrl: '<url-to-redirect-to-on-success>',
  signInOptions: [
    firebase.auth.GoogleAuthProvider.PROVIDER_ID,
    firebase.auth.FacebookAuthProvider.PROVIDER_ID,
    firebase.auth.TwitterAuthProvider.PROVIDER_ID,
    firebase.auth.GithubAuthProvider.PROVIDER_ID,
    firebase.auth.EmailAuthProvider.PROVIDER_ID
  ],
};
```

Then pass that `uiConfig` into the `firebase-ui-auth` component.

```javascript
{{firebase-ui-auth uiConfig=uiConfig}}
```

## Compatibility

This addon is compatible with EmberFire 2.0.x.

## Contributing

### Installation

* `git clone <repository-url>` this repository
* `cd emberfire-utils`
* `npm install`

### Running

* `ember serve`
* Visit your app at [http://localhost:4200](http://localhost:4200).

### Running Tests

* `npm test` (Runs `ember try:each` to test your addon against multiple Ember versions)
* `ember test`
* `ember test --server`

### Building

* `ember build`

For more information on using ember-cli, visit [https://ember-cli.com/](http://ember-cli.com/).
