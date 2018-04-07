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

const { matrixReduce } = require('../index.js');
const { createWrappedEventAction } = require('../src/wrappedSync.js');

const { expect } = require('chai');

const { MatrixEvent, Room, RoomMember } = require('matrix-js-sdk');

const {
    createWrappedAPISuccessAction,
    createWrappedAPIFailureAction,
    createWrappedAPIPendingAction,
} = require('../src/wrappedAPI.js');

function runActionsAndExpectState(actions, expected) {
    let actual;
    actions.forEach((action) => {
        actual = matrixReduce(action, actual);
    });
    expect(actual).to.eql(expected);
}

function createWrappedAPIActions(method, pendingState) {
    const id = Math.random().toString(16).slice(2);

    const actions = [createWrappedAPIPendingAction(method, pendingState, id)];
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

describe('the matrix redux wrap reducer', () => {
    it('is a function', () => {
        expect(matrixReduce).to.be.a('function');
    });

    it('returns initial state when given the undefined action', () => {
        runActionsAndExpectState(
            [undefined],
            { mrw: { wrapped_api: {}, wrapped_state: { rooms: {}, sync: {} } } },
        );
    });

    describe('wraps promise-based APIs such that it', () => {
        it('keeps the status of a call to the API as state', () => {
            const actions = [
                undefined,
                ...createWrappedAPIActions('login', ['username', 'password']).succeed({
                    access_token: '12345',
                }),
            ];
            runActionsAndExpectState(actions, {
                mrw: {
                    wrapped_state: { rooms: {}, sync: {} },
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
                },
            });
        });

        it('reflects multiple APIs as state', () => {
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
                    wrapped_state: { rooms: {}, sync: {} },
                    wrapped_api: {
                        login: {
                            loading: false,
                            status: 'success',
                            pendingState: ['username', 'password'],
                            lastResult: {
                                access_token: '12345',
                            },
                        },
                        logout: {
                            loading: false,
                            status: 'success',
                            pendingState: undefined,
                            lastResult: {
                                msg: 'Logout complete.',
                            },
                        },
                    },
                },
            });
        });

        it('doesn\'t affect the wrapped_event state', () => {
            const actions = [
                undefined,
                createWrappedEventAction('Room', [new Room('!myroomid')]),
                ...createWrappedAPIActions('some_promise_api', [12345]).succeed({
                    result: 'some result',
                }),
            ];
            runActionsAndExpectState(actions, {
                mrw: {
                    wrapped_api: {
                        some_promise_api: {
                            loading: false,
                            status: 'success',
                            pendingState: [12345],
                            lastResult: {
                                result: 'some result',
                            },
                        },
                    },
                    wrapped_state: {
                        rooms: {
                            '!myroomid': {
                                members: {},
                                name: null,
                                timeline: [],
                            },
                        },
                        sync: {},
                    },
                },
            });
        });
    });

    describe('wraps matris-js-sdk state emitted as events such that it', () => {
        it('handles new rooms sent to the client', () => {
            const actions = [
                undefined,
                createWrappedEventAction('Room', [new Room('!myroomid')]),
            ];
            runActionsAndExpectState(actions, {
                mrw: {
                    wrapped_api: {},
                    wrapped_state: {
                        rooms: {
                            '!myroomid': {
                                members: {},
                                name: null,
                                timeline: [],
                            },
                        },
                        sync: {},
                    },
                },
            });
        });

        it('handles multiple new rooms sent to the client', () => {
            const actions = [
                undefined,
                createWrappedEventAction('Room', [new Room('!myroomid')]),
                createWrappedEventAction('Room', [new Room('!someotherroomid')]),
            ];
            runActionsAndExpectState(actions, {
                mrw: {
                    wrapped_api: {},
                    wrapped_state: {
                        rooms: {
                            '!myroomid': {
                                members: {},
                                name: null,
                                timeline: [],
                            },
                            '!someotherroomid': {
                                members: {},
                                name: null,
                                timeline: [],
                            },
                        },
                        sync: {},
                    },
                },
            });
        });

        it('updates room names', () => {
            const namedRoom = new Room('!myroomid');
            namedRoom.name = 'This is a room name';
            const actions = [
                undefined,
                createWrappedEventAction('Room.name', [namedRoom]),
            ];
            runActionsAndExpectState(actions, {
                mrw: {
                    wrapped_api: {},
                    wrapped_state: {
                        rooms: {
                            '!myroomid': {
                                members: {},
                                name: 'This is a room name',
                                timeline: [],
                            },
                        },
                        sync: {},
                    },
                },
            });
        });

        it('handles a new room followed by a room name change', () => {
            const namedRoom = new Room('!myroomid');
            namedRoom.name = 'This is a room name';
            const actions = [
                undefined,
                createWrappedEventAction('Room', [new Room('!myroomid')]),
                createWrappedEventAction('Room.name', [namedRoom]),
            ];
            runActionsAndExpectState(actions, {
                mrw: {
                    wrapped_api: {},
                    wrapped_state: {
                        rooms: {
                            '!myroomid': {
                                members: {},
                                name: 'This is a room name',
                                timeline: [],
                            },
                        },
                        sync: {},
                    },
                },
            });
        });

        it('handles a room name change followed by a new room', () => {
            const namedRoom = new Room('!myroomid');
            namedRoom.name = 'This is a room name';
            const actions = [
                undefined,
                createWrappedEventAction('Room.name', [namedRoom]),
                createWrappedEventAction('Room', [new Room('!myroomid')]),
            ];
            runActionsAndExpectState(actions, {
                mrw: {
                    wrapped_api: {},
                    wrapped_state: {
                        rooms: {
                            '!myroomid': {
                                members: {},
                                name: 'This is a room name',
                                timeline: [],
                            },
                        },
                        sync: {},
                    },
                },
            });
        });

        it('handles a new room followed by two room name changes', () => {
            const namedRoom = new Room('!myroomid');
            namedRoom.name = 'This is a room name';
            const secondNamedRoom = new Room('!myroomid');
            secondNamedRoom.name = 'Some other crazy name';
            const actions = [
                undefined,
                createWrappedEventAction('Room', [new Room('!myroomid')]),
                createWrappedEventAction('Room.name', [namedRoom]),
                createWrappedEventAction('Room.name', [secondNamedRoom]),
            ];
            runActionsAndExpectState(actions, {
                mrw: {
                    wrapped_api: {},
                    wrapped_state: {
                        rooms: {
                            '!myroomid': {
                                members: {},
                                name: 'Some other crazy name',
                                timeline: [],
                            },
                        },
                        sync: {},
                    },
                },
            });
        });

        it('doesn\'t affect the wrapped_api state', () => {
            const actions = [
                undefined,
                ...createWrappedAPIActions('some_promise_api', [12345]).succeed({
                    result: 'some result',
                }),
                createWrappedEventAction('Room', [new Room('!myroomid')]),
            ];
            runActionsAndExpectState(actions, {
                mrw: {
                    wrapped_api: {
                        some_promise_api: {
                            loading: false,
                            status: 'success',
                            pendingState: [12345],
                            lastResult: {
                                result: 'some result',
                            },
                        },
                    },
                    wrapped_state: {
                        rooms: {
                            '!myroomid': {
                                members: {},
                                name: null,
                                timeline: [],
                            },
                        },
                        sync: {},
                    },
                },
            });
        });

        it('tracks sync state', () => {
            const actions = [
                undefined,
                createWrappedEventAction('sync', ['SYNCING']),
            ];
            runActionsAndExpectState(actions, {
                mrw: {
                    wrapped_api: {},
                    wrapped_state: {
                        rooms: {},
                        sync: {
                            state: 'SYNCING',
                        },
                    },
                },
            });
        });

        it('handles new room members', () => {
            const member = new RoomMember('!myroomid', '@userid:domain');
            const event = new MatrixEvent({
                room_id: '!myroomid',
                type: 'm.room.member',
                content: {
                    membership: 'join',
                },
            });
            member.setMembershipEvent(event);
            const actions = [
                undefined,
                createWrappedEventAction('Room', [new Room('!myroomid')]),
                createWrappedEventAction('RoomMember.membership', [event, member]),
            ];
            runActionsAndExpectState(actions, {
                mrw: {
                    wrapped_api: {},
                    wrapped_state: {
                        rooms: {
                            '!myroomid': {
                                name: null,
                                timeline: [],
                                members: {
                                    '@userid:domain': {
                                        membership: 'join',
                                        name: '@userid:domain',
                                    },
                                },
                            },
                        },
                        sync: {},
                    },
                },
            });
        });

        it('handles new room members, with name changes', () => {
            const member = new RoomMember('!myroomid', '@userid:domain');
            const event = new MatrixEvent({
                room_id: '!myroomid',
                type: 'm.room.member',
                content: {
                    membership: 'join',
                },
            });
            const nameEvent = new MatrixEvent({
                room_id: '!myroomid',
                type: 'm.room.member',
                content: {
                    membership: 'join',
                    displayname: 'Neo',
                },
            });
            member.setMembershipEvent(nameEvent);
            const actions = [
                undefined,
                createWrappedEventAction('Room', [new Room('!myroomid')]),
                createWrappedEventAction('RoomMember.membership', [event, member]),
                createWrappedEventAction('RoomMember.name', [nameEvent, member]),
            ];
            runActionsAndExpectState(actions, {
                mrw: {
                    wrapped_api: {},
                    wrapped_state: {
                        rooms: {
                            '!myroomid': {
                                name: null,
                                timeline: [],
                                members: {
                                    '@userid:domain': {
                                        membership: 'join',
                                        name: 'Neo',
                                    },
                                },
                            },
                        },
                        sync: {},
                    },
                },
            });
        });

        it('handles multiple room members', () => {
            const memberA = new RoomMember('!myroomid', '@userid1:domain');
            const memberB = new RoomMember('!myroomid', '@userid2:domain');
            const eventA = new MatrixEvent({
                room_id: '!myroomid',
                type: 'm.room.member',
                content: {
                    membership: 'join',
                    displayname: 'Morpheus',
                },
            });
            const eventB = new MatrixEvent({
                room_id: '!myroomid',
                type: 'm.room.member',
                content: {
                    membership: 'join',
                    displayname: 'Trinity',
                },
            });
            memberA.setMembershipEvent(eventA);
            memberB.setMembershipEvent(eventB);
            const actions = [
                undefined,
                createWrappedEventAction('Room', [new Room('!myroomid')]),
                createWrappedEventAction('RoomMember.membership', [eventA, memberA]),
                createWrappedEventAction('RoomMember.membership', [eventB, memberB]),
            ];
            runActionsAndExpectState(actions, {
                mrw: {
                    wrapped_api: {},
                    wrapped_state: {
                        rooms: {
                            '!myroomid': {
                                name: null,
                                timeline: [],
                                members: {
                                    '@userid1:domain': {
                                        membership: 'join',
                                        name: 'Morpheus',
                                    },
                                    '@userid2:domain': {
                                        membership: 'join',
                                        name: 'Trinity',
                                    },
                                },
                            },
                        },
                        sync: {},
                    },
                },
            });
        });
    });
});
