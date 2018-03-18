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

function createWrappedAPISuccessAction(method, result, id) {
    const type = 'mrw.wrapped_api.success';
    return {
        type, method, result, id,
    };
}

function createWrappedAPIFailureAction(method, error, id) {
    const type = 'mrw.wrapped_api.failure';
    return {
        type, method, error, id,
    };
}

function createWrappedAPIPendingAction(method, pendingState, id) {
    const type = 'mrw.wrapped_api.pending';
    return {
        type, method, pendingState, id,
    };
}

/**
 * Create an asyncronous action for dispatching status updates for a
 * promise.
 * @param  {string} method         location in wrapped_api state to
 *                                 store the status of the promise.
 * @param  {Promise} prom          the promise.
 * @param  {any} pendingState      state to be passed in the pending
 *                                 action.
 * @returns {Function}             thunk that takes the dispatch
 *                                 function as its only argument.
 */
function asyncAction(method, prom, pendingState) {
    const id = Math.random().toString(16).slice(2);
    return (dispatch) => {
        dispatch(createWrappedAPIPendingAction(method, pendingState, id));
        prom.then((result) => {
            dispatch(createWrappedAPISuccessAction(method, result, id));
        }).catch((error) => {
            dispatch(createWrappedAPIFailureAction(method, error, id));
        });
    };
}

module.exports = {
    asyncAction,
    createWrappedAPISuccessAction,
    createWrappedAPIFailureAction,
    createWrappedAPIPendingAction,
};
