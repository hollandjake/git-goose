<h1 align="center">Welcome to git-goose 👋</h1>
<p>
  <a href="https://www.npmjs.com/package/git-goose" target="_blank">
    <img alt="Version" src="https://img.shields.io/npm/v/git-goose.svg">
  </a>
  <a href="https://github.com/hollandjake/git-goose/blob/main/README.md" target="_blank">
    <img alt="Documentation" src="https://img.shields.io/badge/documentation-yes-brightgreen.svg" />
  </a>
  <a href="https://github.com/hollandjake/git-goose/blob/main/LICENSE" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
</p>


> a mongoose plugin that enables git like change tracking

### 🏠 [Homepage](https://github.com/hollandjake/git-goose)

## Install

```sh
npm install git-goose
```

## How it works

**Javascript Version**

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

// Create an instance of your model
const instance = new YourModel({ firstName: "hello", lastName: "world" });
await instance.save(); /* Whenever the instance is updated it will save the changes to the commit log */

// See the initial commit
console.log(await instance.$git.log())
/*
[
  {
    "_id": new ObjectId("66b27926e657391bee997fd6"),
    "patches": [
      {
        "path": "/firstName",
        "op": "add",
        "value": "hello"
      },
      {
        "path": "/lastName",
        "op": "add",
        "value": "world"
      },
      {
        "path": "/_id",
        "op": "add",
        "value": new ObjectId("66b2792685ea221ab5a41b05")
      },
      {
        "path": "/__v",
        "op": "add",
        "value": 0
      }
    ],
    "initialCommit": true,
    "date": "2024-08-06T19:27:34.554Z",
    "id": "66b27926e657391bee997fd6"
  }
]
*/

// Update your model
instance.firstName = "world";
instance.lastName = "hello";
await instance.save();

// To checkout a previous version
const checkedOut = await instance.$git.checkout(1);
console.log(checkedOut.toObject());
/*
{
  firstName: 'hello',
  lastName: 'world',
  _id: new ObjectId('66b2792685ea221ab5a41b05'),
  __v: 0
}
*/

// To compute the diff between two commits
console.log(await instance.$git.diff(1))
/*
[
  { op: 'replace', path: '/firstName', value: 'world' },
  { op: 'replace', path: '/lastName', value: 'hello' }
]
*/
```

**Typescript Version**

```ts
import mongoose from 'mongoose';
import git, {committable} from 'git-goose';

const YourSchema = new mongoose.Schema({
  firstName: String,
  lastName: String
});
// Register the plugin
YourSchema.plugin(git);

// Create your model
// Use committable to inject all the typings for you
const YourModel = committable(mongoose.model("Test", YourSchema, "tests"));

// Create an instance of your model
const instance = new YourModel({ firstName: "hello", lastName: "world" });
await instance.save(); /* Whenever the instance is updated it will save the changes to the commit log */

// See the initial commit
console.log(await instance.$git.log())
/*
[
  {
    "_id": new ObjectId("66b27926e657391bee997fd6"),
    "patches": [
      {
        "path": "/firstName",
        "op": "add",
        "value": "hello"
      },
      {
        "path": "/lastName",
        "op": "add",
        "value": "world"
      },
      {
        "path": "/_id",
        "op": "add",
        "value": new ObjectId("66b2792685ea221ab5a41b05")
      },
      {
        "path": "/__v",
        "op": "add",
        "value": 0
      }
    ],
    "initialCommit": true,
    "date": "2024-08-06T19:27:34.554Z",
    "id": "66b27926e657391bee997fd6"
  }
]
*/

// Update your model
instance.firstName = "world";
instance.lastName = "hello";
await instance.save();

// To checkout a previous version
const checkedOut = await instance.$git.checkout(1);
console.log(checkedOut.toObject());
/*
{
  firstName: 'hello',
  lastName: 'world',
  _id: new ObjectId('66b2792685ea221ab5a41b05'),
  __v: 0
}
*/

// To compute the diff between two commits
console.log(await instance.$git.diff(1))
/*
[
  { op: 'replace', path: '/firstName', value: 'world' },
  { op: 'replace', path: '/lastName', value: 'hello' }
]
*/
```

## Run tests

```sh
npm run test
```

## Author

👤 **Jake Holland**

* Website: https://hollandjake.com
* Github: [@hollandjake](https://github.com/hollandjake)
* LinkedIn: [@hollandjake](https://linkedin.com/in/hollandjake)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/hollandjake/git-goose/issues). 

## Show your support

Give a ⭐️ if this project helped you!

## 📝 License

Copyright © 2024 [Jake Holland](https://github.com/hollandjake).<br />
This project is [MIT](https://github.com/hollandjake/git-goose/blob/main/LICENSE) licensed.
