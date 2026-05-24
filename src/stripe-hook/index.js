export default ({ init }) => {
	if (!global.__stripeRawBodies) {
		global.__stripeRawBodies = new Map();
	}

	init('middlewares.before', ({ app }) => {
		app.use((req, res, next) => {
			const sig = req.headers['stripe-signature'];

			if (!sig) return next();

			const chunks = [];
			req.on('data', (chunk) => chunks.push(chunk));
			req.on('end', () => {
				const rawBody = Buffer.concat(chunks);

				// Store raw body keyed by signature header (unique per request)
				global.__stripeRawBodies.set(sig, {
					body: rawBody,
					timestamp: Date.now(),
				});

				// Evict entries older than 5 minutes to prevent memory leaks
				const cutoff = Date.now() - 5 * 60 * 1000;
				for (const [key, value] of global.__stripeRawBodies) {
					if (value.timestamp < cutoff) {
						global.__stripeRawBodies.delete(key);
					}
				}

				// Parse body for Directus and tell body-parser to skip
				try {
					req.body = JSON.parse(rawBody.toString('utf8'));
				} catch (e) {
					req.body = {};
				}
				req._body = true;
				next();
			});
		});
	});
};
