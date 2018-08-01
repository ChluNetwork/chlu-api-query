const path = require('path')
const { get } = require('lodash')
const ChluIPFS = require('chlu-ipfs-support')
const express = require('express')
const cors = require('cors')
const { isValidMultihash } = require('chlu-ipfs-support/src/utils/ipfs')

class ChluAPIQuery {
    constructor(config = {}) {
        const chluIpfsConfig = get(config, 'chluIpfsConfig', {})
        const directory = path.join(process.env.HOME, '.chlu-query')
        if (!chluIpfsConfig.directory) chluIpfsConfig.directory = directory
        this.chluIpfs = get(config, 'chluIpfs', null)
        if (!this.chluIpfs) this.chluIpfs = new ChluIPFS(chluIpfsConfig)
        this.port = get(config, 'port', 3005)
        this.logger = get(config, 'logger', this.chluIpfs.logger)
        this.prepareAPI()
        this.log = msg => this.logger.debug(`[API] ${msg}`)
    }

    async start() {
        await this.chluIpfs.start()
        this.log('Starting HTTP Server')
        await new Promise(resolve => this.api.listen(this.port, resolve))
        this.log(`Started HTTP Server on port ${this.port}`)
    }

    async stop() {
        await this.chluIpfs.stop()
    }

    isDIDID(didId) {
        return typeof didId === 'string' && didId.indexOf('did:') === 0
    }

    prepareAPI() {
        this.api = express()
        this.api.use(cors())
        this.api.get('/', (req, res) => res.send('Chlu API Query').end())
        const apiv1 = this.prepareAPIV1()
        this.api.use('/api/v1', apiv1)
    }

    prepareAPIV1() {
        const api = express()

        api.get('/reviews/:cid', async (req, res) => {
            const cid = req.params.cid
            const getLatestVersion = get(req, 'query.getLatestVersion', true) === 'false' ? false : true
            this.log(`Requested Review Record ${cid}, getLatestVersion: ${getLatestVersion ? 'yes' : 'no'}`)
            if (!isValidMultihash(cid)) {
                res.status(400).json(createError(`Multihash ${cid} is invalid`))
            } else {
                try {
                    const result = await this.chluIpfs.readReviewRecord(cid, {
                        getLatestVersion,
                        validate: {
                            throwErrors: false
                        }
                    })
                    if (typeof result === 'object') {
                        delete result.editable // that information is specific to the user's DID, so the client will have to recompute it
                    }
                    this.log(`Review Record ${cid}, getLatestVersion: ${getLatestVersion ? 'yes' : 'no'} => OK ${JSON.stringify(result)}`)
                    res.json(result)
                } catch (error) {
                    this.log(`Review Record ${cid}, getLatestVersion: ${getLatestVersion ? 'yes' : 'no'} => ERROR ${error.message}`)
                    console.error(error)
                    res.status(500).json(createError(error.message || 'Unknown Error'))
                }
            }
        })

        api.get('/dids/:id', async (req, res) => {
            const didId = req.params.id
            const waitUntilPresent = get(req, 'query.waitUntilPresent', false) === 'true'
            this.log(`Requested DID ${didId}, waitUntilPresent: ${waitUntilPresent ? 'yes' : 'no'}`)
            if (!this.isDIDID(didId)) {
                res.status(400).json(createError(`DID ID ${didId} is invalid`))
            } else {
                try {
                    const result = await this.chluIpfs.getDID(didId, waitUntilPresent)
                    if (result) {
                        this.log(`DID ${didId} => OK ${JSON.stringify(result)}`)
                        res.json(result)
                    } else {
                        // Not found
                        this.log(`DID ${didId} => NOT FOUND`)
                        res.status(404).json(createError(`DID ${didId} not found`))
                    }
                } catch (error) {
                    this.log(`DID ${didId} => ERROR ${error.message}`)
                    console.error(error)
                    res.status(500).json(createError(error.message || 'Unknown Error'))
                }
            }
        })

        api.get('/dids/:id/reviews/about', async (req, res) => {
            const didId = req.params.id
            this.log(`Requested Reviews about DID ${didId}`)
            if (!this.isDIDID(didId)) {
                res.status(400).json(createError(`DID ID ${didId} is invalid`))
            } else {
                try {
                    const result = await this.chluIpfs.getReviewsAboutDID(didId)
                    if (result) {
                        this.log(`Reviews by DID ${didId} => OK ${JSON.stringify(result)}`)
                        res.json(result)
                    }
                } catch (error) {
                    this.log(`Reviews by DID ${didId} => ERROR ${error.message}`)
                    console.error(error)
                    res.status(500).json(createError(error.message || 'Unknown Error'))
                }
            }
        })

        api.get('/dids/:id/reviews/writtenby', async (req, res) => {
            const didId = req.params.id
            this.log(`Requested Reviews about DID ${didId}`)
            if (!this.isDIDID(didId)) {
                res.status(400).json(createError(`DID ID ${didId} is invalid`))
            } else {
                try {
                    const result = await this.chluIpfs.getReviewsWrittenByDID(didId)
                    if (result) {
                        this.log(`Reviews by DID ${didId} => OK ${JSON.stringify(result)}`)
                        res.json(result)
                    }
                } catch (error) {
                    this.log(`Reviews by DID ${didId} => ERROR ${error.message}`)
                    console.error(error)
                    res.status(500).json(createError(error.message || 'Unknown Error'))
                }
            }
        })

        return api
    }

}

function createError(message) {
    return { message }
}

module.exports = ChluAPIQuery