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

const getInObj = (obj, path) =>
    (path.reduce((value, el) => value[el], obj));

const setInObj = (obj = {}, pathItems, value) => {
    if (pathItems.length === 1) {
        const pathItem = pathItems.shift();
        return Object.assign(
            obj,
            { [pathItem]: value },
        );
    }
    const pathItem = pathItems.shift();

    return Object.assign(obj, {
        [pathItem]: setInObj(obj[pathItem], pathItems, value),
    });
};

function isMatrixReduxAction(action) {
    return action &&
        action.type && typeof action.type === 'string' &&
        action.type.startsWith('mrw');
}

function reduceWrappedAPIAction(action, path, state) {
    const prevState = state;
    const status = path[1];

    const apiState = Object.assign(
        state[action.method] || {},
        {
            status, // pending/success/failure
            loading: status === 'pending',
        },
    );

    switch (status) {
    case 'success': {
        apiState.lastResult = action.result;
        break;
    }
    case 'failure': {
        apiState.lastError = action.error;
        break;
    }
    case 'pending': {
        apiState.pendingState = action.pendingState;
        break;
    }
    default:
        break;
    }

    return Object.assign(prevState, {
        [action.method]: apiState,
    });
}

function reduceWrappedEventAction(action, path, wrappedState) {
    switch (action.emittedType) {
    case 'sync': {
        return setInObj(
            wrappedState,
            ['sync', 'state'],
            action.emittedArgs.state,
        );
    }
    case 'Room': {
        const { roomId } = action.emittedArgs;
        const newState = Object.assign(
            {},
            wrappedState.rooms[roomId] || {
                name: null,
                members: {},
                timeline: [],
                state: {},
            },
        );

        return setInObj(wrappedState, ['rooms', roomId], newState);
    }
    case 'Room.name': {
        const { roomId, name } = action.emittedArgs;
        const prevState = Object.assign(
            {},
            wrappedState.rooms[roomId] || {
                name: null,
                members: {},
                timeline: [],
                state: {},
            },
        );

        const newState = Object.assign(prevState, { name });

        return setInObj(wrappedState, ['rooms', roomId], newState);
    }
    case 'RoomState.events': {
        const {
            roomId,
            type,
            content,
            ts,
            sender,
            stateKey,
        } = action.emittedArgs;
        const prevState = Object.assign(
            {},
            wrappedState.rooms[roomId] || {
                name: null,
                members: {},
                timeline: [],
                state: {},
            },
        );

        prevState.state = setInObj(prevState.state, [type, stateKey], {
            type,
            content,
            sender,
            ts,
        });

        return setInObj(wrappedState, ['rooms', roomId], prevState);
    }
    case 'RoomMember.membership': {
        const {
            roomId,
            membership,
            name,
            userId,
        } = action.emittedArgs;

        return setInObj(wrappedState, ['rooms', roomId, 'members', userId], { membership, name });
    }
    case 'RoomMember.name': {
        const {
            roomId,
            userId,
            name,
        } = action.emittedArgs;

        return setInObj(wrappedState, ['rooms', roomId, 'members', userId, 'name'], name);
    }
    case 'Room.timeline': {
        const {
            roomId,
            id,
            type,
            content,
            prevContent,
            ts,
            sender,
            redactedBecause,
        } = action.emittedArgs;

        const timeline = getInObj(wrappedState, ['rooms', roomId, 'timeline']) || [];

        return setInObj(
            wrappedState,
            ['rooms', roomId, 'timeline'],
            [...timeline, {
                content,
                prevContent,
                ts,
                sender,
                type,
                id,
                redactedBecause,
            }],
        );
    }
    default:
        return wrappedState;
    }
}

function initialState() {
    return { mrw: { wrapped_api: {}, wrapped_state: { rooms: {}, sync: {} } } };
}

function matrixReduce(action, state) {
    if (action === undefined) {
        return initialState();
    }
    if (!isMatrixReduxAction(action)) return state;

    const path = action.type.split('.').slice(1);

    // path[0]: 'wrapped_event' OR 'wrapped_api'

    const subReducer = {
        wrapped_event: {
            statePath: ['mrw', 'wrapped_state'],
            reduceFn: reduceWrappedEventAction,
        },
        wrapped_api: {
            statePath: ['mrw', 'wrapped_api'],
            reduceFn: reduceWrappedAPIAction,
        },
    }[path[0]];

    if (!subReducer) {
        throw new Error(`Unsupported mrw type ${path[0]}`);
    }

    const oldState = getInObj(state, subReducer.statePath);

    const newState = subReducer.reduceFn(action, path, oldState);

    return setInObj(state, subReducer.statePath, newState);
}

module.exports = matrixReduce;
