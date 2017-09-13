const Twitter = require( "twitter" );

/*
	TwitterRequestQueue

		Implements a queue for twitter requests
		that will automatically wait until the
		appropriate time if a rate limit is hit.

		Queue is processed in FIFO order, with
		rate-limited endpoint requests being deferred
		and non-limiited requests being processed.
*/
function TwitterRequestQueue( credentials, request_delay ) {
	this.queue = [];
	this.endpoints = {};
	this.client = null;
	if ( credentials )
		this.setCredentials( credentials );
	this.request_delay = request_delay || 50;
	this.queue_started = false;
	this.timeout = false;
}

/*
	setCredentials
		takes an object with a consumer key and secret,
		and either a user token/secret, or a bearer token

	User Auth
	{
		consumer_key: key,
		consumer_secret: secret,
		access_token_key: user_key,
		access_token_secret: user_secret,
	}

	App Auth
	{
		consumer_key: key,
		consumer_secret: secret,
		bearer_token: bearer_token,
	}
*/
TwitterRequestQueue.prototype.setCredentials = function( credentials ) {
	this.client = new Twitter( credentials );
};

TwitterRequestQueue.prototype.parseResponse = function( response ) {
	return new Promise( ( resolve, reject ) => {
		let data;
		try {
			data = {
				limit: +response.headers[ "x-rate-limit-limit" ],
				remaining: +response.headers[ "x-rate-limit-remaining" ],
				reset: new Date( response.headers[ "x-rate-limit-reset" ] * 1000 ),
			};
		} catch ( error ) {
			return reject( error );
		}

		return resolve( data );
	});
};

TwitterRequestQueue.prototype.saveResponse = function( endpoint, limits ) {
	this.endpoints[ endpoint ] = limits;
};

TwitterRequestQueue.prototype.addToQueue = function( params ) {
	this.queue.push( params );
	this.processQueue();
};

/*
	get
		takes the twitter api endpoint,
		any get params the request needs,
		a callback with ( error, result ) arguments
*/
TwitterRequestQueue.prototype.get = function( endpoint, params, callback ) {
	this.addToQueue({
		type: "get",
		endpoint: endpoint,
		params: params,
		callback: callback,
	});
};

/*
	post
		takes the twitter api endpoint,
		any post params the request needs,
		a callback with ( error, result ) arguments
*/
TwitterRequestQueue.prototype.post = function( endpoint, params, callback ) {
	this.addToQueue({
		type: "post",
		endpoint: endpoint,
		params: params,
		callback: callback,
	});
};

TwitterRequestQueue.prototype.processGet = function( endpoint, params, callback ) {

	return new Promise( ( resolve ) => {
		if ( params ) {
			this.client.get( endpoint, params, ( error, tweets, response ) => {
				this.parseResponse( response )
					.then( ( parsed_response ) => {
						this.saveResponse( endpoint, parsed_response );
						callback( error, tweets, response );
						resolve();
					})
					.catch( ( parse_error ) => {
						callback( [ error, parse_error ], tweets, response );
						resolve();
					});
			});
		}
		else {
			this.client.get( endpoint, ( error, tweets, response ) => {
				this.parseResponse( response )
					.then( ( parsed_response ) => {
						this.saveResponse( endpoint, parsed_response );
						callback( error, tweets, response );
						resolve();
					})
					.catch( ( parse_error ) => {
						callback( [ error, parse_error ], tweets, response );
						resolve();
					});
			});
		}
	});
};

TwitterRequestQueue.prototype.processPost = function( endpoint, params, callback ) {

	return new Promise( ( resolve ) => {
		if ( params ) {
			this.client.post( endpoint, params, ( error, tweets, response ) => {
				this.parseResponse( response )
					.then( ( parsed_response ) => {
						this.saveResponse( endpoint, parsed_response );
						callback( error, tweets, response );
						resolve();
					})
					.catch( ( parse_error ) => {
						callback( [ error, parse_error ], tweets, response );
						resolve();
					});
			});
		}
		else {
			this.client.post( endpoint, ( error, tweets, response ) => {
				this.parseResponse( response )
					.then( ( parsed_response ) => {
						this.saveResponse( endpoint, parsed_response );
						callback( error, tweets, response );
						resolve();
					})
					.catch( ( parse_error ) => {
						callback( [ error, parse_error ], tweets, response );
						resolve();
					});
			});
		}
	});
};

TwitterRequestQueue.prototype.validateRequest = function( request ) {
	if ( typeof request.endpoint !== "string" )
		throw new Error( "request is not a string" );
	if ( typeof request.callback !== "function" )
		throw new Error( "callback is not a function" );
};

TwitterRequestQueue.prototype.processRequest = function( request ) {

	if ( request.type === "get" )
		return this.processGet( request.endpoint, request.params, request.callback );
	else if ( request.type === "post" )
		return this.processPost( request.endpoint, request.params, request.callback );

};

TwitterRequestQueue.prototype.isLimited = function( endpoint ) {
	if ( this.endpoints[ endpoint ] ) {
		let reset_in_millis = ( +this.endpoints[ endpoint ].reset - +new Date() );

		if ( reset_in_millis < 0 )
			this.endpoints[ endpoint ].remaining = Math.max( 1, this.endpoints[ endpoint ].remaining );

		if ( ! this.endpoints[ endpoint ].remaining ) {
			return {
				limited: true,
				reset_in_millis: reset_in_millis,
			};
		}
		else {
			return {
				limited: false,
			};
		}
	}
	else {
		return {
			limited: false,
		};
	}
};

TwitterRequestQueue.prototype.processQueue = function() {
	let self = this;
	if ( ! self.queue.length ) {
		self.queue_started = false;
		return;
	}
	if ( self.queue_started ) {
		return;
	}
	clearTimeout( self.timeout );
	self.queue_started = true;
	let earliest_reset = Infinity;
	let processing = false;
	self.queue.forEach( ( request, index ) => {

		if ( processing )
			return;

		let limited = self.isLimited( request.endpoint );
		if ( ! limited.limited ) {
			self.queue.splice( index, 1 );
			processing = true;
			self.processRequest( request )
				.then(() => {
					self.timeout = setTimeout( () => {
						self.queue_started = false;
						self.processQueue();
					}, self.request_delay );
				});
		}
		else {
			earliest_reset = Math.min( earliest_reset, limited.reset_in_millis );
		}
	});
	if ( ! processing ) {
		self.queue_started = false;
		if ( earliest_reset < Infinity ) {
			self.timeout = setTimeout( () => {
				self.processQueue();
			}, earliest_reset );
		}
	}
};

module.exports = TwitterRequestQueue;