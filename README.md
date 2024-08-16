# git-goose

[![npm package](https://img.shields.io/npm/v/git-goose.svg)](https://www.npmjs.com/package/git-goose)
[![documentation](https://img.shields.io/badge/documentation-yes-brightgreen.svg) ](https://github.com/hollandjake/git-goose/blob/main/README.md)
[![licence](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/hollandjake/git-goose/blob/main/LICENSE)

A mongoose plugin that enables git like change tracking
with CommonJS, ESM, and TypeScript support

## 🛠 Installation

```sh
npm install git-goose
```

### Javascript Version

Supports both CommonJS and ESM

```js
const mongoose = require("mongoose");
const git = require("git-goose");

const YourSchema = new mongoose.Schema({
  firstName: String,
  lastName: String
});
// Register the plugin
YourSchema.plugin(git);

// Create your model
const YourModel = mongoose.model("Test", YourSchema, "tests");

/* Then use your model however you would normally */
```

### Typescript Version

```ts
import mongoose from 'mongoose';
import git, { committable } from 'git-goose';

const YourSchema = new mongoose.Schema({
  firstName: String,
  lastName: String
});
// Register the plugin
YourSchema.plugin(git);

// Create your model
// Use committable to inject all the typings for you
const YourModel = committable(mongoose.model("Test", YourSchema, "tests"));

/* Then use your model however you would normally */
```

## 🔬 How it works

Whenever an instance is created or updated it will save the changes to a new mongo collection containing the commit
log. So from a normal users perspective they can keep doing what they would normally do!

> By default, a new collection is created per collection the plugin is loaded on, however this can be configured if
> you wish to have all the logs for all collections in a single collection

### Supports

#### Creation

**Through Document.save()**

```ts
const instance = new YourModel({ firstName: 'hello', lastName: 'world' });
await instance.save();
```

**Through Model.create()**

```ts
const instance = await YourModel.create({ firstName: "hello", lastName: "world" });
```

#### Updating

**Through a document update**

```ts
instance.firstName = 'world';
instance.lastName = 'hello';
await instance.save();
```

**Through any of the Model level mutators**

```ts
await YourModel.updateOne({ firstName: 'hello' }, { firstName: 'world', lastName: 'hello' });
await YourModel.updateMany({ firstName: "hello" }, { firstName: 'world', lastName: 'hello' });
await YourModel.findOneAndUpdate({ firstName: "hello" }, { firstName: 'world', lastName: 'hello' });
await YourModel.findOneAndReplace({ firstName: "hello" }, { firstName: 'world', lastName: 'hello' });
```

### Return the changes since last commit

Similar to git, it will return all the changes since last commit

```ts
const instance = new YourModel({ firstName: 'hello', lastName: 'world' });
const status = await instance.$git.status();
/*
{
  type: 'json-patch',
  ops: [
    {
      op: 'replace',
      path: '',
      value: {
        firstName: 'hello',
        lastName: 'world',
        _id: new ObjectId('66be1b5ed47739c9e7a52a0f')
      }
    }
  ]
}
*/
```

### View commit history

By default, the logs are ordered by descending date so the latest commit is in index 0

You can provide custom filters, projections and options as its arguments for custom sorting etc.

```ts
const log = await instance.$git.log()
/*
[
  {
    _id: new ObjectId('66be1b5ed47739c9e7a52a17'),
    patch: {
      type: 'json-patch',
      ops: [
        { op: 'replace', path: '/firstName', value: 'world' },
        { op: 'replace', path: '/lastName', value: 'hello' }
      ],
      _id: new ObjectId('66be1b5ed47739c9e7a52a18')
    },
    date: 2024-08-15T15:41:52.892Z,
    id: '66be1b5ed47739c9e7a52a17'
  },
  {
    _id: new ObjectId('66be1b5ed47739c9e7a52a12'),
    patch: {
      type: 'json-patch',
      ops: [
        {
          op: 'replace',
          path: '',
          value: {
            firstName: 'hello',
            lastName: 'world',
            _id: new ObjectId('66be1b5ed47739c9e7a52a0f')
          }
        }
      ],
      _id: new ObjectId('66be1b5ed47739c9e7a52a13')
    },
    date: 2024-08-15T15:39:49.436Z,
    id: '66be1b5ed47739c9e7a52a12'
  }
]
*/
```

### Checkout a previous commit

You are able to restore to a previous commit using checkout, this will reproduce the instance as it was at that point in
time. The response will be a fully hydrated object so you can use all the bells and whistles that mongoose provides like
population

```ts
const snapshot = await instance.$git.checkout(1)
/*
{
  firstName: 'hello',
  lastName: 'world',
  _id: new ObjectId('66be1b5ed47739c9e7a52a0f')
}
*/
```

or if you prefer a more git like syntax `HEAD`, `HEAD^`, `HEAD^N`, and its corresponding `@` versions are all supported

or you can use a date string or Date object, this will find the newest commit that meets this timestamp,
so remember that JS dates default to midnight if no time is provided.

```ts
const snapshot = await instance.$git.checkout("2024-08-15T15:39:49.436Z")
```

### Computing the difference between two commits

As with checkout, all arguments support all types of commit references.

**Compare against HEAD**
```ts
const diff = await instance.$git.diff(1)
/*
{
  type: 'json-patch',
  ops: [
    { op: 'replace', path: '/firstName', value: 'world' },
    { op: 'replace', path: '/lastName', value: 'hello' }
  ]
}
*/
```

**Compare two other commits**

```ts
const instance = await YourModel.create({ firstName: 'hello', lastName: 'world' });
instance.firstName = 'wow';
await instance.save();
instance.firstName = 'amazing';
await instance.save();
instance.firstName = 'cool';
await instance.save();

const diff = await instance.$git.diff(3, 1);
/*
{
  type: 'json-patch',
  ops: [ { op: 'replace', path: '/firstName', value: 'amazing' } ]
}
*/
```

## 🏠 Homepage

You can find more about this on [GitHub](https://github.com/hollandjake/git-goose).

## 🖋️ Contributing

Contributions, issues and feature requests are welcome!

Feel free to check [issues page](https://github.com/hollandjake/git-goose/issues).

## 🤝 Show your support

Give a ⭐ if this package helped you!

## 📜 License

This project is [MIT](https://github.com/hollandjake/git-goose/blob/main/LICENSE) licensed.
