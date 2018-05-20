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

const { matrixReduce, asyncAction } = require('../src');
const Matrix = require('matrix-js-sdk');

const readline = require('readline');

// Define Async Action Creators

function doRegister(mxClient, username, password) {
    return asyncAction(
        'registrationState',
        mxClient.register(username, password).catch((err) => {
            if (err.data.flows) {
                // XXX: Assume that the server allows m.login.dummy
                return mxClient.register(
                    username,
                    password,
                    err.data.session,
                    { type: 'm.login.dummy' },
                );
            }
            throw err;
        }).catch(console.error),
        { username },
    );
}

// A simple render function
function render(state) {
    let view = '';

    const {
        registrationState,
    } = state.mrw.wrapped_api;

    if (!registrationState) {
        return view;
    }

    const { username } = registrationState.pendingState || {};
    if (registrationState.loading) {
        view =
            `  [ You are now being registered, ${username}!  . ]`;
    } else {
        view = registrationState.status === 'success' ?
            `  [ You're now registered, ${username}!         ✓ ]` :
            `  [ You failed to register, ${username}!        ⤫ ]`;
    }
    return view;
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
console.info('Registration Example');
console.info('---------------------------------------------------');

let domain = 'matrix.org';

// initialise store
dispatch(undefined);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.question(`What's your home server? (${domain}):\n     `, (newDomain) => {
    domain = newDomain.length > 0 ? newDomain : domain;

    const baseUrl = `https://${domain}`;
    const mxClient = Matrix.createClient({ baseUrl });

    rl.question('Enter your new credentials (username password):\n     ', (answer) => {
        const [username, password] = answer.split(' ');

        doRegister(mxClient, username, password)(dispatch);
    });
});
