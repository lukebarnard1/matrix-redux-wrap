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

const MatrixReducer = require('../src/index.js').MatrixReducer;
const expect = require('chai').expect;

function runActionsAndExpectState (actions, expected) {
    let actual = undefined;
    actions.forEach((action) => {
        actual = MatrixReducer(action, actual);
    });
    expect(actual).to.eql(expected);
}

function createWrappedAPISuccessAction (method, result, id) {
    return {
        type: "mrw.wrapped_api.success",
        method, result, id,
    };
}

function createWrappedAPIFailureAction (method, error, id) {
    return {
        type: "mrw.wrapped_api.failure",
        method, error, id,
    };
}

function createWrappedAPIPendingAction (method, args, id) {
    return {
        type: "mrw.wrapped_api.pending",
        method, args, id,
    };
}

function createWrappedAPIActions (method, args) {
    const id = Math.random().toString(16).slice(2);

    const actions = [createWrappedAPIPendingAction(method, args, id)];
    return {
        succeed: (result) => {
            actions.push(createWrappedAPISuccessAction(method, result, id));
            return actions;
        },
        fail: (error) => {
            actions.push(createWrappedAPIFailureAction(method, error, id));
            return actions;
        }
    }
}

describe('the matrix-redux-wrap reducer', () => {
    it('should be a function', () => {
        expect(MatrixReducer).to.be.a('function');
    });

    it('should return initial state when given the `undefined` action', () => {
        runActionsAndExpectState([undefined],
            { mrw: { wrapped_api: {}}}
        );
    });

    it('should update to include login credentials after login', () => {
        const actions = [
            undefined,
            // Call login with args
            ...createWrappedAPIActions(
                "login", ["username", "password"]
            ).succeed({
                access_token: '12345'
            }),
        ];
        runActionsAndExpectState(actions, {
            mrw: { wrapped_api: { login: {
                loading: false,
                status: "success",
                lastArgs: ["username", "password"],
                lastResult: {
                    access_token: '12345',
                },
            }}},
        });
    });
});
