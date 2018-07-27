const ChluAPIQuery = require('../src')
const sinon = require('sinon')
const expect = require('chai').expect
const request = require('supertest')
const logger = require('chlu-ipfs-support/tests/utils/logger')

describe('HTTP server', () => {

    let chluApiQuery, chluIpfs, app,  fakeReviewRecords

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
        chluIpfs = {
            start: sinon.stub().resolves(),
            readReviewRecord: sinon.stub().callsFake(async x => {
                return fakeReviewRecords[x]
            }),
            logger: logger('API Server')
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

        it('GET /dids/:id')

        it('GET /dids/:id/reviews/writtenby')

        it('GET /dids/:id/reviews/about')

    })

})