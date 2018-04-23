# Matrix Redux Wrap :taco:

[![Build Status](https://travis-ci.org/lukebarnard1/matrix-redux-wrap.svg?branch=master)](https://travis-ci.org/lukebarnard1/matrix-redux-wrap)

A library that exposes matrix-js-sdk state via Redux

## Contents 
 - [Introduction](#introduction)
 - [Usage](#usage)
 - [Docs](#documentation)
 
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

## Documentation
Below is a quick explanation of the provided API for using matrix-redux-wrap. 
For full examples of how these functions can be used, see the [examples directory](/examples).

### `asyncAction(stateKey, promise) => (dispatch) => {...}`
Returns a function that calls the `dispatch` argument asyncronously as such:
 - Once immediately, dispatching a "pending" action;
 - then, depending on whether the promise resolves or is rejected, either:
   - it dispatches a "success" action or
   - it dispatches an "failure" action.

These actions will have namespaced `type` fields of:
 - `mrw.wrapped_api.pending`
 - `mrw.wrapped_api.success`
 - `mrw.wrapped_api.failure`
 
Each of these have different fields present and all can be passed to 
`matrixRedux` to update the `mrw.wrapped_api` state. 

#### mrw.wrapped_api.pending
```js
{
  type: "mrw.wrapped_api.pending", 
  method: stateKey, 
  pendingState: ..., 
  id: "bfadef89"
}
```
 - `method`: the `stateKey` given to `asyncAction`
 - `id`: an random opaque identifier for this call to `asyncAction`
 
#### mrw.wrapped_api.success
```js
{
  type: "mrw.wrapped_api.success", 
  method: stateKey, 
  result: ..., 
  id: "bfadef89"
}
```
 - `method`: see above
 - `id`: an random opaque identifier that refers to the previously dispatched "pending" action
 - `result`: the value that `promise` resolved to
 
#### mrw.wrapped_api.failure
```js
{ 
  type: "mrw.wrapped_api.failure", 
  method: stateKey, 
  error: ..., 
  id: "bfadef89"
}
```
 - `method`, `id`: see above
 - `error`: the value that the `promise` was rejected with

### `wrapSyncingClient(matrixClient) => void`
When given a `matrix-js-sdk` MatrixClient instance, it will dispatch an action for each event
emitted by the instance, taking certain keys from the event, assigning them to fields on the
action. Once a client instance is passed to the function, the caller calls `startClient` to 
start the long-polling process that will cause the instance to emit events.

This creates actions of the following shape:
```js
{
  type: 'mrw.wrapped_event',
  emittedType: 'Room.timeline',
  emittedArgs: wrappedArgs,
}
```
`matrixReduce` can be used to reduce these actions to the current state of the matrix client
as exposed in the state under the `mrw` key.

### `matrixReduce(action, state) => newState`
Reduces state according to the `mrw.*` action passed, returning the new state. The state has
the following structure:
```js
{
  mrw: {
    wrapped_api: {
      login: {
        loading: false,
        status: 'success',
        pendingState: ['username', 'password'],
        lastResult: {
          access_token: '12345',
        },
      },
    },
    wrapped_state: {
      sync: {
        state: 'SYNCING',
      },
      rooms: {
        '!myroomid': {
          members: {
            '@userid:domain': {
              membership: 'join',
              name: 'Morpheus',
            },
          },
          name: "some room name",
          state: {
            'm.room.member': {
              '@userid:domain': {
                id: '$some_awesome_event_id',
                content: {
                  membership: 'join',
                  name: 'Morpheus',
                  avatarUrl: 'mxc://domain/flibblejibble',
                },
                ts: 1234,
              },
            },
            'm.room.avatar': {
              '': {
                content: {
                  url: 'mxc://domain/flibblejibble',
                },
              },
            },
          },
          timeline: [{
            id: '$some_event_id',
            type: 'm.room.message',
            content: { body: 'hello, world!' },
            sender: '@userid:domain',
            ts: 12345,
          }, {
            id: '$some_other_event_id',
            type: 'm.room.message',
            content: { body: 'hello (again), world!' },
            sender: '@userid:domain',
            ts: 123456,
          }, {
            id: '$some_other_event_id2',
            type: 'x.weird.event',
            content: {},
            sender: '@userid:domain',
            ts: 1234567,
            redactedBecause: {
              sender: '@userid:domain',
              ts: 12345678,
            },
          }],
          receipts: {
            '$some_event_id': {
              'm.receipt': {
                '@userid:domain': {
                  ts: 12345,
                },
              },
            },
          },
        },
      },
    },
  },
}
```
