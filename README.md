# Matrix Redux Wrap :taco:

[![Build Status](https://travis-ci.org/lukebarnard1/matrix-redux-wrap.svg?branch=master)](https://travis-ci.org/lukebarnard1/matrix-redux-wrap)

A library that exposes matrix-js-sdk state via Redux

## Contents 
 - [Introduction](#introduction)
 - [Usage](#usage)
 
## Introduction
Matrix Redux Wrap was motivated by the need to expose the Matrix protocol via a Redux store. The matrix-js-sdk API does not expose a Redux-like pattern through which data flows but rather a number of asyncronous HTTP-request wrappers and a number of models that encapsulate the objects within the Matrix protocol. These models are updated by a mixture of server responses and API calls and do not necessarily lend themselves to simple mental models or the ability to be incorporated into frameworks such as Flux and Redux.

### Could we do better?
Wrapping matrix-js-sdk is not the ideal solution. Ideally, the logic contained within it (for handling the Matrix-specific long-polling etc.) could be split out into a special Asynchronous Action Creator. A reducer could be written to handle the dispatched actions and update the store accordingly. However, the complexity of this task iss greater than creating Matrix Redux Wrap, which harnesses the existing logic of the js-sdk whilst paying the price of duplicating js-sdk model state.

## Usage
For examples, see [the examples directory](/examples).

Simple usage:
```js
const { wrapSyncingClient, matrixReduce } = require('matrix-redux-wrap');
const Matrix = require('matrix-js-sdk');

let state = {};
const dispatch = (action) => {
    state = matrixReduce(action, state);
   
    const roomCount = Object.keys(state.mrw.wrapped_state.rooms).length;
    console.info('You are in ' + roomCount + ' rooms');
}

// initialise store
dispatch(undefined);

const syncClient = Matrix.createClient({
    baseUrl: "https://my.home.server",
    userId: "@myusername:my.home.server",
    accessToken: "myaccesstoken12345",
});
wrapSyncingClient(syncClient, dispatch);
syncClient.startClient();
```
Output:
```
...
You are in 1234 rooms
You are in 1234 rooms
You are in 1234 rooms
...
```

