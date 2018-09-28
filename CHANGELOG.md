# Chlu API Query Changelog

## v0.3.1

- updated deps

## v0.3.0

Breaking Changes:

- `/dids/:id/reviews/about` and `/dids/:id/reviews/writtenby` now return `{ rows, count }` datastructure

Other Changes:

- use chlu-ipfs-support 0.3
- fix starting without --postgres
- accept `limit` and `offset` query parameters in `/dids/:id/reviews/about` and `/dids/:id/reviews/writtenby`

## v0.2.0

- added CLI params for Chlu SQL DB

## v0.1.0

First release
