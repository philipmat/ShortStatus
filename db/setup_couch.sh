#!/bin/bash
curl -X DELETE http://127.0.0.1:5984/shortstatus
curl -X PUT http://127.0.0.1:5984/shortstatus
curl -X PUT http://127.0.0.1:5984/shortstatus/_design/stats --data-binary @couchdb_designs.json
