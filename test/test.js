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
        actual = MatrixReducer(actual, actual);
    });
    expect(actual).to.eql(expected);
}

describe('the matrix-redux-wrap reducer', () => {
    it('should be a function', () => {
        expect(MatrixReducer).to.be.a('function');
    });

    it('should return initial state when given the `undefined` action', () => {
        runActionsAndExpectState([undefined], {});
    });
});
