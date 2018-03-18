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

// Log a user into their matrix account
function doLogin(mxClient, user, password) {
    // Call to the matrix-js-sdk login API
    const prom = mxClient.login('m.login.password', { user, password });

    return asyncAction('loginState', prom, { user });
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
            `  [ You are logging in, ${user}!    . ] -> `;
    } else {
        view = loginState.status === 'success' ?
            `  [ You're now logged in, ${user}!  ✓ ] <-` :
            `  [ You failed to log in, ${user}!  ⤫ ] <-`;
    }

    return view;
}

// A super simple app
let state = {};
let view = '';
function dispatch(action) {
    state = MatrixReducer(action, state);
    view = render(state);
    console.info(`${view}`);
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

