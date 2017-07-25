# twitter-request-queue-node

## Smart request queue for Twitter rate-limiting
Implements a queue for twitter requests that will automatically wait until the appropriate time if a rate limit is hit.

Queue is processed in FIFO order, with rate-limited endpoint requests being deferred, and non-limiited requests being processed.

## Usage
This currently extends the [NPM Twitter package](https://github.com/desmondmorris/node-twitter), and takes the same constructor, .get, and .post methods

```js
const TwitterRequestQueue = require( "twitter-request-queue-node" );

// App Auth
const queue = new TwitterRequestQueue({
	consumer_key: "key",
	consumer_secret: "secret",
	bearer_token: "bearer_token,
});

// User Auth
const queue = new TwitterRequestQueue({
	consumer_key: "key",
	consumer_secret: "secret",
	bearer_token: "bearer_token,
});

// queue request

queue.get( "help/privacy", null, ( error, data ) => {
	if ( error )
		return console.log( error );
	console.log( data );
});
```