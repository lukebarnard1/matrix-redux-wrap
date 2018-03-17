/* global describe it */
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

const { MatrixReducer } = require('../src/index.js');
const { expect } = require('chai');

const { MatrixEvent } = require('matrix-js-sdk');

function runActionsAndExpectState(actions, expected) {
    let actual;
    actions.forEach((action) => {
        actual = MatrixReducer(action, actual);
    });
    expect(actual).to.eql(expected);
}

function createWrappedAPISuccessAction(method, result, id) {
    return {
        type: 'mrw.wrapped_api.success',
        method,
        result,
        id,
    };
}

function createWrappedAPIFailureAction(method, error, id) {
    return {
        type: 'mrw.wrapped_api.failure',
        method,
        error,
        id,
    };
}

function createWrappedAPIPendingAction(method, args, id) {
    return {
        type: 'mrw.wrapped_api.pending',
        method,
        args,
        id,
    };
}

function createWrappedAPIActions(method, args) {
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
        },
    };
}

function createWrappedEventAction(eventType, args) {
    return { type: 'mrw.wrapped_event', eventType, ...args };
}

describe('the matrix redux wrap reducer', () => {
    it('should be a function', () => {
        expect(MatrixReducer).to.be.a('function');
    });

    it('should return initial state when given the undefined action', () => {
        runActionsAndExpectState(
            [undefined],
            { mrw: { wrapped_api: {}, wrapped_state: { rooms: {} } } },
        );
    });

    it('should update to include login credentials after login', () => {
        const actions = [
            undefined,
            ...createWrappedAPIActions('login', ['username', 'password']).succeed({
                access_token: '12345',
            }),
        ];
        runActionsAndExpectState(actions, {
            mrw: {
                wrapped_api: {
                    login: {
                        loading: false,
                        status: 'success',
                        lastArgs: ['username', 'password'],
                        lastResult: {
                            access_token: '12345',
                        },
                    },
                },
            },
        });
    });

    it('should handle more than one update via wrapped APIs', () => {
        const actions = [
            undefined,
            ...createWrappedAPIActions('login', ['username', 'password']).succeed({
                access_token: '12345',
            }),
            ...createWrappedAPIActions('logout').succeed({
                msg: 'Logout complete.',
            }),
        ];
        runActionsAndExpectState(actions, {
            mrw: {
                wrapped_api: {
                    login: {
                        loading: false,
                        status: 'success',
                        lastArgs: ['username', 'password'],
                        lastResult: {
                            access_token: '12345',
                        },
                    },
                    logout: {
                        loading: false,
                        status: 'success',
                        lastArgs: undefined,
                        lastResult: {
                            msg: 'Logout complete.',
                        },
                    },
                },
            },
        });
    });

    describe('should update matrix state accordingly', () => {
        it('should update room state when receiving a room state event', () => {
            const actions = [
                undefined,
                createWrappedEventAction(
                    'Room.name',
                    {
                        event: new MatrixEvent({
                            type: 'm.room.name',
                            content: {
                                name: 'This is a room name',
                            },
                            room_id: '!myroomid',
                        }),
                    },
                ),
            ];
            runActionsAndExpectState(actions, {
                mrw: {
                    wrapped_state: {
                        rooms: {
                            '!myroomid': {
                                name: 'This is a room name',
                            },
                        },
                    },
                },
            });
        });
    });
});
