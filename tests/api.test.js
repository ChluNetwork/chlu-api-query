const ChluAPIQuery = require('../src')
const ChluIPFSDID = require('chlu-ipfs-support/src/modules/did')
const sinon = require('sinon')
const expect = require('chai').expect
const request = require('supertest')
const logger = require('chlu-ipfs-support/tests/utils/logger')

describe('HTTP server', () => {

    let chluApiQuery, chluIpfs, app
    let fakeReviewRecords, fakeDIDDocuments, fakeReviewsWrittenByDID, fakeReviewsAboutDID

    before(() => {
        // disable logs
        process.env.DISABLE_LOGS = '1'
    })

    beforeEach(() => {
        fakeReviewRecords = {
            'QmWBTzAwP8fz2zRsmzqUfSKEZ6GRTuPTsBVfJs6Y72D1hz': {
                review: 'hello world',
                editable: false
            }
        }
        fakeReviewsWrittenByDID = {
            'did:chlu:abc': [ { content: 'data' }]
        }
        fakeReviewsAboutDID = {
            'did:chlu:abc': [ { content: 'data' }]
        }
        fakeDIDDocuments = {
            'did:chlu:abc': {
                content: 'data'
            }
        }
        chluIpfs = {
            start: sinon.stub().resolves(),
            readReviewRecord: sinon.stub().callsFake(async x => {
                return fakeReviewRecords[x]
            }),
            getDID: sinon.stub().callsFake(async x => {
                return fakeDIDDocuments[x] || null
            }),
            getReviewsWrittenByDID: sinon.stub().callsFake(async x => {
                return fakeReviewsWrittenByDID[x] || []
            }),
            getReviewsAboutDID: sinon.stub().callsFake(async x => {
                return fakeReviewsAboutDID[x] || []
            }),
            logger: logger('API Server'),
            didIpfsHelper: {
                isDIDID: sinon.stub().callsFake(ChluIPFSDID.isDIDID)
            }
        }
        chluApiQuery = new ChluAPIQuery({ chluIpfs })
        app = request(chluApiQuery.api)
    })

    it('starts correctly', async () => {
        expect(chluApiQuery.start).to.be.a('function')
        chluApiQuery.api = {
            listen: sinon.stub().callsFake((port, cb) => cb())
        }
        await chluApiQuery.start()
        expect(chluApiQuery.port).to.equal(3005)
        expect(chluIpfs.start.called).to.be.true
        expect(chluApiQuery.api.listen.calledWith(chluApiQuery.port)).to.be.true
    })

    it('/', async () => {
        await app.get('/').expect(200)
    })

    describe('/api/v1', () => {

        it('GET /reviews/:cid', async () => {
            await app.get('/api/v1/reviews/lol').expect(400)
            const multihash = 'QmWBTzAwP8fz2zRsmzqUfSKEZ6GRTuPTsBVfJs6Y72D1hz' // valid but not real
            await app.get(`/api/v1/reviews/${multihash}`)
                .expect('Content-Type', 'application/json; charset=utf-8')
                .expect(200, { review: 'hello world' })
            let options = chluIpfs.readReviewRecord.args[0][1]
            expect(options).to.deep.equal({
                validate: { throwErrors: false },
                getLatestVersion: true
            })
            await app.get(`/api/v1/reviews/${multihash}?getLatestVersion=false`)
                .expect('Content-Type', 'application/json; charset=utf-8')
                .expect(200, { review: 'hello world' })
            options = chluIpfs.readReviewRecord.args[1][1]
            expect(options).to.deep.equal({
                validate: { throwErrors: false },
                getLatestVersion: false
            })
        })

        it('GET /dids/:id', async () => {
            await app.get('/api/v1/dids/lol').expect(400)
            await app.get('/api/v1/dids/did:chlu:notexists').expect(404)
            await app.get('/api/v1/dids/did:chlu:abc')
                .expect(200, { content: 'data' })
            expect(chluIpfs.getDID.calledWith('did:chlu:abc')).to.be.true
            expect(chluIpfs.didIpfsHelper.isDIDID.calledWith('did:chlu:abc')).to.be.true
        })

        it('GET /dids/:id/reviews/writtenby', async () => {
            await app.get('/api/v1/dids/lol/reviews/writtenby').expect(400)
            await app.get('/api/v1/dids/did:chlu:abc/reviews/writtenby')
                .expect(200, [{ content: 'data' }])
            await app.get('/api/v1/dids/did:chlu:def/reviews/writtenby').expect(200, [])
        })

        it('GET /dids/:id/reviews/about', async () => {
            await app.get('/api/v1/dids/lol/reviews/about').expect(400)
            await app.get('/api/v1/dids/did:chlu:abc/reviews/about')
                .expect(200, [{ content: 'data' }])
            await app.get('/api/v1/dids/did:chlu:def/reviews/about').expect(200, [])
        })

    })

})