/* eslint-env mocha */

const chai = require('chai')
chai.use(require('chai-as-promised'))
const { assert } = chai
const fs = require('fs').promises
const path = require('path')
const { readBuffer, readFileComplete, writeStream } = require('../')
const { acid, car } = require('./fixture-data')

describe('Errors', () => {
  it('unimplemented methods', async () => {
    const carDs = await readBuffer(car)
    await assert.isRejected(carDs.batch())
    await assert.isRejected(carDs.batch('foo'))
    await carDs.close()
  })

  it('bad gets', async () => {
    const carDs = await readBuffer(car)
    await assert.isRejected(carDs.get('blip')) // not a CID key
    await assert.isFulfilled(carDs.get(acid)) // sanity check
    await carDs.close()
  })

  it('bad has\'', async () => {
    const carDs = await readBuffer(car)
    await assert.isRejected(carDs.has('blip')) // not a CID key
    await assert.isFulfilled(carDs.has(acid)) // sanity check
    await carDs.close()
  })

  it('bad queries', async () => {
    const carDs = await readBuffer(car)
    assert.throws(() => carDs.query('blip'))
    assert.throws(() => carDs.query(false))
    assert.throws(() => carDs.query(null))
    await carDs.close()
  })

  it('bad root type', async () => {
    const carDs = await writeStream(fs.createWriteStream('test.car'))
    assert.isRejected(carDs.setRoots('blip'))
    assert.isRejected(carDs.setRoots(['blip']))
    assert.isRejected(carDs.setRoots([acid, false]))
    await carDs.close()
  })

  it('bad puts', async () => {
    const carDs = await writeStream(fs.createWriteStream('test.car'))
    await assert.isRejected(carDs.put(acid, 'blip')) // not a Buffer value
    await assert.isRejected(carDs.put('blip', Buffer.from('blip'))) // not a CID key
    await carDs.close()
  })

  it('truncated file', async () => {
    const data = await fs.readFile(path.join(__dirname, 'go.car'))
    await fs.writeFile('test.car', data.slice(0, data.length - 5))
    await assert.isRejected(readFileComplete('test.car'), {
      name: 'Error',
      message: 'Unexpected end of file'
    })
  })

  after(async () => {
    return fs.unlink('test.car').catch(() => {})
  })
})
