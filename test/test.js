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

const MatrixStore = require('../src/index.js').MatrixStore;
var expect = require('chai').expect;

describe('the matrix-redux-wrap store', function() {
  it('should expose the Redux API', function() {
    expect(MatrixStore).to.have.property('getState').that.is.a('function');
    expect(MatrixStore).to.have.property('dispatch').that.is.a('function');
    expect(MatrixStore).to.have.property('subscribe').that.is.a('function');
  });
});
