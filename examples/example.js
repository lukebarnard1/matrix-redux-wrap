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

const { matrixReduce, asyncAction, wrapSyncingClient } = require('../index.js');
const Matrix = require('matrix-js-sdk');

const readline = require('readline');

// Define Async Action Creators


function doLogout(mxClient) {
    return asyncAction('logoutState', mxClient.logout());
}

// Log a user into their matrix account and start syncing
function doLoginAndSync(mxClient, baseUrl, user, password) {
    return (dis) => {
        // Call to the matrix-js-sdk login API
        const promise = mxClient.login('m.login.password', { user, password });

        // Action-ify this promise
        asyncAction('loginState', promise, { user })(dis);

        promise.then((resp) => {
            // Create a new matrix client for syncing with the server
            const syncClient = Matrix.createClient({
                baseUrl,
                userId: resp.user_id,
                accessToken: resp.access_token,
            });
            wrapSyncingClient(syncClient);
            syncClient.startClient();

            console.info('-----------will log out in 20s-----------');
            setTimeout(() => {
                syncClient.stopClient();
                doLogout(syncClient)(dis);
            }, 20000);
        });
    };
}

// A simple render function
function render(state) {
    let view = '';

    const {
        loginState,
        logoutState,
    } = state.mrw.wrapped_api;

    if (!loginState) {
        return view;
    }

    const { user } = loginState.pendingState;

    if (logoutState) {
        if (logoutState.loading) {
            view =
                `  [ You are logging out, ${user}     . ]`;
        } else {
            view = logoutState.status === 'success' ?
                `  [ You're now logged out, ${user}!  ✓ ]` :
                `  [ You failed to log out, ${user}!  ⤫ ]`;
        }
    } else if (loginState.loading) {
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
                .map((k) => {
                    const { name, members } = state.mrw.wrapped_state.rooms[k];
                    const memberCount = Object.keys(members).length;
                    return `${name}: ${memberCount} members`;
                }).slice(0, 5),
        ].join(' \n      - ');
    }

    return `${view}${roomView}`;
}

// A super simple app
let state = {};
let view = '';
let nextView = '';
function dispatch(action) {
    state = matrixReduce(action, state);

    nextView = render(state);

    // Prevent unecessary re-renders
    if (nextView !== view) {
        view = nextView;
        console.info(`${view}`);
    }
}

console.info();
console.info('---------------------------------------------------');
console.info('This is a simple example of matrixReduce usage! :D');
console.info('---------------------------------------------------');

let domain = 'matrix.org';

// initialise store
dispatch(undefined);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.question(`What's your home server? (${domain}): `, (newDomain) => {
    domain = newDomain.length > 0 ? newDomain : domain;

    const baseUrl = `https://${domain}`;
    const mxClient = Matrix.createClient({ baseUrl });

    rl.question('And your credentials? (username password): ', (answer) => {
        const [username, password] = answer.split(' ');

        doLoginAndSync(mxClient, baseUrl, username, password)(dispatch);
    });
});
