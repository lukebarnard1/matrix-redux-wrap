/* eslint { "no-console": "off"} */
/*
Copyright 2018 Luke Barnard

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/

const { MatrixReducer, asyncAction } = require('./index.js');
const Matrix = require('matrix-js-sdk');

// Define Async Action Creators

function createWrappedEventAction(eventType, args) {
    return { type: 'mrw.wrapped_event', eventType, ...args };
}

// Log a user into their matrix account and start syncing
function doLoginAndSync(mxClient, user, password) {
    return (dis) => {
        // Call to the matrix-js-sdk login API
        const promise = mxClient.login('m.login.password', { user, password });

        // Action-ify this promise
        asyncAction('loginState', promise, { user })(dis);

        promise.then((resp) => {
            // Create a new matrix client for syncing with the server
            const syncClient = Matrix.createClient({
                baseUrl: 'https://matrix.org',
                userId: resp.user_id,
                accessToken: resp.access_token,
            });
            syncClient.on('Room', (room) => {
                dis(createWrappedEventAction('Room', { room }));
            });
            syncClient.on('Room.name', (room) => {
                dis(createWrappedEventAction('Room.name', { room }));
            });
            syncClient.startClient();
        });
    };
}

// A simple render function
function render(state) {
    let view = '';

    const { loginState } = state.mrw.wrapped_api;
    if (!loginState) {
        return view;
    }
    const { user } = loginState.pendingState;

    if (loginState.loading) {
        view =
            `  [ You are logging in, ${user}!    . ]`;
    } else {
        view = loginState.status === 'success' ?
            `  [ You're now logged in, ${user}!  ✓ ]` :
            `  [ You failed to log in, ${user}!  ⤫ ]`;
    }

    let roomView = '';

    if (state.mrw.wrapped_state.rooms &&
        Object.keys(state.mrw.wrapped_state.rooms).length > 0
    ) {
        roomView = [
            '\n    [ Rooms ]',
            ...Object.keys(state.mrw.wrapped_state.rooms)
                .map(k => state.mrw.wrapped_state.rooms[k].name)
                .slice(0, 5),
        ].join(' \n      - ');
    }

    return `${view}${roomView}`;
}

// A super simple app
let state = {};
let view = '';
let nextView = '';
function dispatch(action) {
    state = MatrixReducer(action, state);

    nextView = render(state);

    // Prevent unecessary re-renders
    if (nextView !== view) {
        view = nextView;
        console.info(`${view}`);
    }
}

console.info();
console.info('---------------------------------------------------');
console.info('This is a simple example of MatrixReducer usage! :D');
console.info('---------------------------------------------------');

const mxClient = Matrix.createClient({
    baseUrl: 'https://matrix.org',
});

// initialise store
dispatch(undefined);

doLogin(mxClient, 'username', 'password')(dispatch);

