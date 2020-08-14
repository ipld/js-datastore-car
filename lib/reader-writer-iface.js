import interfaceDatastore from 'interface-datastore'
import { verifyRoots } from './util.js'

const { Errors } = interfaceDatastore

class Reader {
  /* c8 ignore next 3 */
  get () {
    throw new Error('Unimplemented method')
  }

  /* c8 ignore next 3 */
  has () {
    throw new Error('Unimplemented method')
  }

  /* c8 ignore next 3 */
  keys () {
    throw new Error('Unimplemented method')
  }

  close () {}

  getRoots () {
    return this.roots
  }
}

class Writer {
  put () {
    throw new Error('Unimplemented method')
  }

  delete () {
    throw new Error('Unimplemented method')
  }

  setRoots (roots) {
    this.roots = verifyRoots(roots)
  }

  close () {}
}

class NoWriter extends Writer {
  setRoots () {
    throw new Error('Unimplemented method')
  }
}

class DecodedReader extends Reader {
  constructor (carData) {
    super()
    this._carData = carData
  }

  has (key) {
    return this._carData.keys.indexOf(key.toString()) > -1
  }

  async get (key) {
    const index = this._carData.keys.indexOf(key.toString())
    if (index < 0) {
      throw Errors.notFoundError()
    }
    return this._carData.blocks[index].binary
  }

  keys () {
    return this._carData.keys
  }

  get roots () {
    return this._carData.roots
  }
}

class StreamingReader extends Reader {
  constructor (decoder) {
    super()
    this._decoder = decoder
  }

  has (key) {
    throw new Error('Unsupported operation for streaming reader')
  }

  get (key) {
    throw new Error('Unsupported operation for streaming reader')
  }

  async getRoots () {
    return (await this._decoder.header()).roots
  }

  async * iterator (keysOnly) {
    // TODO: optimise `keysOnly` case by skipping over decoding blocks and just read the CIDs
    for await (const block of this._decoder.blocks()) {
      const key = block.cid.toString()
      if (keysOnly) {
        yield { key }
      } else {
        yield { key, value: block.binary }
      }
    }
  }
}

async function createFromDecoded (decoded) {
  const cids = decoded.blocks.map((b) => b.cid)
  decoded.keys = cids.map((c) => c.toString())
  return new DecodedReader(decoded)
}

export { createFromDecoded, Reader, Writer, StreamingReader, NoWriter }
