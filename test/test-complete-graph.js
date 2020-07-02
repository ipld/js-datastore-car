/* eslint-env mocha */

const { assert } = require('chai')
const { writeStream, readBuffer, completeGraph } = require('../')
const Block = require('@ipld/block')
const { PassThrough } = require('stream')

async function createGet (blocks) {
  const db = new Map()
  for (const block of blocks) {
    db.set((await block.cid()).toString('base64'), block)
  }
  return (cid) => new Promise((resolve) => resolve(db.get(cid.toString('base64'))))
}

async function concat (stream) {
  const buffers = []
  for await (const buffer of stream) {
    buffers.push(buffer)
  }
  return Buffer.concat(buffers)
}

describe('Create car for full graph', () => {
  it('small graph', async () => {
    const leaf1 = Block.encoder({ hello: 'world' }, 'dag-cbor')
    const leaf2 = Block.encoder({ test: 1 }, 'dag-cbor')
    const raw = Block.encoder(Buffer.from('test'), 'raw')
    const root = Block.encoder(
      {
        one: await leaf1.cid(),
        two: await leaf2.cid(),
        three: await leaf1.cid(),
        zraw: await raw.cid()
      },
      'dag-cbor')
    const expected = [root, leaf1, leaf2, raw]

    const get = await createGet(expected)
    const stream = new PassThrough()
    const car = await writeStream(stream)
    await completeGraph(await root.cid(), get, car)
    const data = await concat(stream)

    const carDs = await readBuffer(data)
    const roots = await carDs.getRoots()
    assert.strictEqual(roots.length, 1)
    assert.deepStrictEqual(roots[0], await root.cid())

    for await (const { key: cid } of carDs.query()) {
      const expectedBlock = expected.shift()
      assert.strictEqual(cid, (await expectedBlock.cid()).toString())
    }
  })
})
