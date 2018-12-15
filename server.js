#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const http2 = require('http2');
const Koa = require('koa');
const fetch = require('node-fetch');


const app = new Koa();

// TODO: If intending to use in production, configure all of this via command line flags instead

const certPath = 'cert.pem';
const keyPath = 'key.pem';
const dhparamPath = 'dhparams.pem';

const httpsEnabled =
	fs.existsSync(certPath) &&
	fs.existsSync(keyPath) &&
	fs.existsSync(dhparamPath)
;


app.use(async ctx => {
	try {
		if (!ctx.host || ctx.get('X-Reverse-Proxied')) {
			throw new Error('Host header not set.');
		}

		const res = await fetch(
			`${ctx.protocol}://${ctx.host}${ctx.url}`,
			{
				body: ctx.body,
				headers: {
					// Workaround for Koa quirk
					...Object.entries(ctx.headers).
						filter(([k]) => !k.startsWith(':')).
						reduce((o, [k, v]) => ({...o, [k]: v}), {})
					,
					// Workaround for Node requesting quirk
					connection: undefined,
					// Used for detecting recursive request
					'X-Reverse-Proxied': true
				},
				method: ctx.method,
				redirect: 'follow',
				referrer: 'no-referrer'
			}
		);

		for (const [header, value] of res.headers.entries()) {
			ctx.set(header, value);
		}

		ctx.body = res.body;
		ctx.status = res.status;
	}
	catch (err) {
		ctx.body = err.toString();
		ctx.status = 400;
	}
	finally {
		ctx.set('Access-Control-Allow-Methods', '*');
		ctx.set('Access-Control-Allow-Origin', '*');
		ctx.set('X-Frame-Options', 'SAMEORIGIN');

		if (ctx.secure) {
			// Also consider setting Public-Key-Pins
			ctx.set('Expect-CT', 'max-age=31536000, enforce');
			ctx.set('Strict-Transport-Security', 'max-age=31536000; includeSubdomains');
		}
	}
});


const onRequestHandler = app.callback();

http.createServer(onRequestHandler).listen(80);

if (httpsEnabled) {
	http2.createSecureServer(
		{
			allowHTTP1: true,
			cert: fs.readFileSync(certPath),
			key: fs.readFileSync(keyPath),
			dhparam: fs.readFileSync(dhparamPath),
			secureOptions: crypto.constants.SSL_OP_NO_SSLv3 | crypto.constants.SSL_OP_NO_TLSv1
		},
		onRequestHandler
	).listen(
		443
	);
}
else {
	console.error(
		'WARNING: HTTPS not enabled. ' +
		'To enable HTTPS, save a valid cert to cert.pem in the current directory, ' +
		'key to key.pem, and DH parameters to dhparams.pem.'
	);
}
