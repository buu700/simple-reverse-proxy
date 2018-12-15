# simple-reverse-proxy

## Overview

This is a reverse proxy.

## How to use

	# Optional TLS setup
	openssl req -x509 -newkey rsa:2048 -sha256 -days 365 -nodes -keyout key.pem -out cert.pem -subj '/CN=localhost'
	openssl dhparam -out dhparam.pem 2048

	npm install
	npm start

---

NOTE: There's an edge case redirect-following bug in here, which most likely needs to be reported
to `node-fetch` and/or Node itself.

HTTP -> HTTPS is followed, and naked domain -> www subdomain is followed, but trying to do both
(e.g. `curl -H 'Host: cyph.com' http://localhost/wp-content/uploads/2018/10/auditconclusion.txt`)
fails with `FetchError: maximum redirect reached`.
