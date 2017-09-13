require( "dotenv" ).config();

const chai = require( "chai" );
const expect = chai.expect;
const Twitter = require( "../index.js" );

let queue;

describe( "Environment Variables", () => {

	describe( "TWITTER_CONSUMER_KEY", () => {
		it( "Should not be null", () => {
			expect( process.env.TWITTER_CONSUMER_KEY ).to.not.be.empty;
		});
	});

	describe( "TWITTER_CONSUMER_SECRET", () => {
		it( "Should not be null", () => {
			expect( process.env.TWITTER_CONSUMER_SECRET ).to.not.be.empty;
		});
	});

	describe( "TWITTER_ACCESS_TOKEN", () => {
		it( "Should not be null", () => {
			expect( process.env.TWITTER_ACCESS_TOKEN ).to.not.be.empty;
		});
	});

	describe( "TWITTER_ACCESS_TOKEN_SECRET", () => {
		it( "Should not be null", () => {
			expect( process.env.TWITTER_ACCESS_TOKEN_SECRET ).to.not.be.empty;
		});
	});

});

describe( "Get Request", () => {

	before( () => {
		queue = new Twitter({
			consumer_key: process.env.TWITTER_CONSUMER_KEY,
			consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
			access_token_key: process.env.TWITTER_ACCESS_TOKEN,
			access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
		});
	});

	describe( "retrieve privacy policy", () => {

		it( "Should not be null", ( done ) => {

			queue.get( "help/privacy", null, ( error, data ) => {
				if ( error )
					throw error;
				expect( data ).to.not.be.empty;
				done();
			});

		});

	});

	describe( "retrieve some tweets", () => {

		it( "Should not be null", ( done ) => {

			queue.get( "search/tweets", { q: "happy", count: 1 }, ( error, data ) => {
				if ( error )
					throw error;
				expect( data ).to.not.be.empty;
				done();
			});

		});

	});

});