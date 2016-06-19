/* eslint-env mocha */

const expect = require('chai').expect
const show_info = require('../lib/show_info')

describe('show_info', function () {
  it('should parse a file in SxxExx notation', function () {
    const si1 = show_info('Show Name.S01E02.Another Name.ext')
    expect(si1.season).to.be.equal(1)
    expect(si1.episode).to.be.equal(2)
    expect(si1.name).to.be.equal('Show Name')
  })
})
