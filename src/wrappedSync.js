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

const emittedEventToEmittedArgs = {
    sync: state => ({ state }),
    Room: room => ({ roomId: room.roomId }),
    'Room.timeline': rawEvent => ({
        roomId: rawEvent.getRoomId(),
        id: rawEvent.getId(),
        type: rawEvent.getType(),
        content: rawEvent.getContent(),
        prevContent: rawEvent.getPrevContent(),
        ts: rawEvent.getTs(),
        sender: rawEvent.getSender(),
        redactedBecause: rawEvent.getUnsigned().redacted_because,
    }),
    'Room.name': room => ({
        roomId: room.roomId,
        name: room.name,
    }),
    'Room.receipt': event => ({
        roomId: event.getRoomId(),
        content: event.getContent(),
    }),
    'Room.redaction': event => ({
        redactedBecause: {
            sender: event.getSender(),
            content: event.getContent(),
            ts: event.getTs(),
        },
        redactedEventId: event.event.redacts,
        roomId: event.getRoomId(),
    }),
    'RoomState.events': event => ({
        roomId: event.getRoomId(),
        type: event.getType(),
        content: event.getContent(),
        ts: event.getTs(),
        sender: event.getSender(),
        stateKey: event.getStateKey(),
    }),
    'RoomMember.membership': (event, member) => ({
        roomId: event.getRoomId(),
        userId: member.userId,
        name: member.name,
        membership: member.membership,
        avatarUrl: member.events.member ?
            member.events.member.getContent().avatar_url :
            null,
    }),
    'RoomMember.name': (event, member) => ({
        roomId: event.getRoomId(),
        userId: member.userId,
        name: member.name,
    }),
};

function createWrappedEventAction(emittedType, emittedArgs) {
    const fn = emittedEventToEmittedArgs[emittedType];


    const wrappedArgs = fn(...emittedArgs);

    return {
        type: 'mrw.wrapped_event',
        emittedType,
        emittedArgs: wrappedArgs,
    };
}

function wrapSyncingClient(syncClient, dispatch) {
    Object.keys(emittedEventToEmittedArgs).forEach(emittedType =>
        syncClient.on(
            emittedType,
            (...emittedArgs) =>
                dispatch(createWrappedEventAction(emittedType, emittedArgs)),
        ));
}

module.exports = {
    createWrappedEventAction,
    wrapSyncingClient,
};
