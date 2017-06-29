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
  * [Queries for non-model data](#flexible-queries)
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
* `cacheId` to prevent duplicate listeners and make the query result array update in realtime
  * Without `cacheId`, the query result array won't listen for `child_added` or `child_removed` changes. However, the models that are already inside of it will still update in realtime.
  * `cacheId` isn't available in `queryRecord`.

#### With path

```javascript
this.get('store').query('post', {
  path: 'userFeeds/user_a',
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

#### `hasMany` doesn't work ####

Without being able to limit how many data gets downloaded by `hasMany`, it's generally bad for Firebase apps.

Alternatively, use [`hasFiltered`](#hasfiltered-relationship-not-really-a-relationship).

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

## `hasFiltered` relationship (not really a relationship)

Most of the time, we don't want to use the `hasMany()` relationship in our models because:

1. It loads all the data when we access it.
2. Even if we don't access it, those array of IDs are still taking up internet data usage.

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
const pushId = this.get('firebaseUtil').generateIdForRecord();
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

To make things easy and familiar, `firebase-util` service provides methods for finding records that's similar with [`DS.Store`](http://emberjs.com/api/data/classes/DS.Store.html).

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
  },

  "userFeeds": {
    "foo" : {
      "post_a" : true
    },
    "hello" : {
      "post_a" : true
    }
  },

  "posts" : {
    "post_a" : {
      "title" : "Title",
      "message" : "Message"
    }
  }
}
```

#### Retrieving a single record

To retrieve a single record, call `findRecord()`. This will return a promise that fulfills with the requested record in a plain object format.

```javascript
this.get('firebaseUtil').findRecord('referenceId', 'users/foo').then((record) => {
  // Do something with `record`
}).catch(error => {
  // Do something with `error`
});
```

The first parameter of `findRecord()` should be a unique ID of your choice. This enables the service to return the cached record if it already exists. In addition, this prevents duplicate Firebase listeners should we have the instance to call `findRecord()` more than once on the same reference ID.

#### Retrieving multiple records

To retrieve multiple records, call `findAll()`. This will return a promise that fulfills with the requested records; each one in a plain object format.

```javascript
this.get('firebaseUtil').findAll('users').then((records) => {
  // Do something with `records`
}).catch(error => {
  // Do something with `error`
});
```

Notice that we don't pass a unique ID like the one in `findRecord()`. This is because unlike `findRecord()`, any changes made under the Firebase path **won't** be synchronized in realtime. So there's no need to cache the records or prevent duplicate listeners.

> Typically, it's bad practice to do a `value` listener on a path that has multiple records due to the potential to download huge amounts of data whenever a property changes.

##### Serialized to plain objects

For `findRecord()` and `findAll()`, the records are serialized in plain object. For the `findRecord()` example 
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

### Checking if record exists

To check if a record exists, call `isRecordExisting()` method on the `firebase-util` service. This returns a promise that fulfills to `true` if the record exists. Otherwise, `false`.

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

For more information on using ember-cli, visit [http://ember-cli.com/](http://ember-cli.com/).
