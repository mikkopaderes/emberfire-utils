# Emberfire Utilities

This addon provides some useful utilities on top of [Emberfire](https://github.com/firebase/emberfire).

## Features

* [Multi-path updates](#multi-path-updates)
* [Storage uploads](#storage-uploads)
* [Flexible queries for flattened data structure and infinite scrolling](#flexible-queries)
* [`hasLimited` model relationship](#haslimited-relationship)

## Usage

### Multi-path updates

To write on multiple paths atomically in Firebase, call `update()` method on the `firebase-util` service.

```javascript
let fanoutObject = {};

fanoutObject['users/foo/firstName'] = 'Foo';
fanoutObject['users/bar/firstName'] = 'Bar';

this.get('firebaseUtil').update(fanoutObject).then(() => {
  // Do something after a succesful update
}).catch(error => {
  // Do something with `error`
});
```

### Storage uploads

To upload files in Firebase storage, call `upload()` method on the `firebase-util` service.

```javascript
// File should be a Blob
this.get('firebaseUtil').upload(file, 'docs/foo').then(downloadURL => {
  // Do something with `downloadURL`
}).catch(error => {
  // Do something with `error`
});
```

### Flexible queries

To make things easy and familiar, `firebase-util` service provides methods for finding records that's similar 
with [`DS.Store`](http://emberjs.com/api/data/classes/DS.Store.html).

For the examples below, assume we have the following Firebase data:

```json
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
```

#### Retrieving a single record

To retrieve a single record, call `findRecord()` method on the `firebase-util` service. This will return a 
promise that fulfills with the requested record. Unlike `store.findRecord`, this will resolve in a plain 
object.

```javascript
this.get('firebaseUtil').findRecord('referenceId', 'users/foo').then(record => {
  // Do something with `record`
}).catch(error => {
  // Do something with `error`
});
```

The first parameter of `findRecord()` should be a unique ID of your choice. This enables the service to return 
the cached record if it already exists. In addition, this prevents duplicate Firebase listeners should we have 
the instance to call `findRecord()` more than once on the same reference ID.

#### Retrieving multiple records

To retrieve multiple records, call `findAll()` method on the `firebase-util` service. Similar to `findRecord`, 
this will return a promise that fulfills with the requested records; each one in a plain object format.

```javascript
this.get('firebaseUtil').findAll('users').then(records => {
  // Do something with `records`
}).catch(error => {
  // Do something with `error`
});
```

Notice that we don't pass a unique ID like the one in `findRecord()`. This is because unlike `findRecord()`, 
any changes made under the Firebase path **won't** be synchronized in realtime. So there's no need to cache 
the records or prevent duplicate listeners.

> Typically, it's bad practice to do a `value` listener on a path that has multiple records due to the potential 
> to download huge amounts of data whenever a property changes.

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

### Querying for multiple records

To query for multiple records, call `query()` method on the `firebase-util` service. This also returns a 
promise that fulfills to the requested records. But unlike the 2 methods above, this serializes the records 
to a specified model.

```javascript
this.get('firebaseUtil').query('user', 'referenceId', 'users', {limitToLast: 1}).then(records => {
  // Do something with `records`
}).catch(error => {
  // Do something with `error
});
```

The first param is the model name and the fourth param are the Firebase filters which uses the same format as 
the one in [Emberfire](https://github.com/firebase/emberfire/blob/master/docs/guide/querying-data.md).


#### Loading more records in your queries for infinite scrolling

Continuing the example above, we can load more records by calling `next()`.

```javascript
this.get('firebaseUtil').next('referenceId', 10);
```

We used the `referenceId` as an easy way to know which listener should load the next 10 records. Records would 
simply be pushed to the query result and will reflect to all variables and templates that uses it. Thus, 
`next()` doesn't return a promise.

> Because we used `limitToLast` in the example above, `next()` would load the next 10 `limitToLast` records.

### `hasLimited` relationship

Most of the time, we don't want to use the `hasMany()` relationship in our models because:

1. It loads all the data when we access it.
2. The related data gets nested in the parent model in Firebase. Which goes against the teaching in 
[Structure Your Database](https://firebase.google.com/docs/database/web/structure-data) guide.

To solve those 2 problems above, use `hasLimited()` relationship. It has the same parameters as 
`firebaseUtil.query()` and it also works with infinite scrolling through `firebaseUtil.next()`.

```javascript
import Model from 'ember-data/model';
import attr from 'ember-data/attr';

import hasLimited from 'emberfire-utils/utils/has-limited';

export default Model.extend({
  photoURL: attr('string'),
  username: attr('string'),
  posts: hasLimited('post', '$id_posts', 'posts/$id', {limitToFirst: 20})
});

```

Notice the `$id`. It's a keyword that will be replaced by the model's ID.

> `hasLimited()` are read only.

## Compatibility

This addon currently supports Ember CLI 2.8.0 that comes with Ember.js 2.8-LTS.

> I'm planning to support only the latest [Ember CLI](https://ember-cli.com/) that comes with the latest LTS 
> version of Ember.js. No other tests will be made for other versions. In addition, this addon's dependency of 
> Emberfire would be of the latest version that's compatible with the Ember CLI mentioned earlier.

## Contributing

### Installation

* `git clone <repository-url>` this repository
* `cd emberfire-utils`
* `npm install`
* `bower install`

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
