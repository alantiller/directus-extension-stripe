import crypto from 'node:crypto';

export default {
	id: 'stripe-verify-signature',
	handler: ({ webhook_secret }, { data, logger }) => {
		const trigger = data['$trigger'];
		const sig = trigger?.headers?.['stripe-signature'];

		if (!sig) {
			throw new Error('Missing stripe-signature header on the incoming request.');
		}

		if (!webhook_secret) {
			throw new Error('Webhook signing secret is required.');
		}

		// Retrieve raw body captured by the stripe-hook middleware
		const stored = global.__stripeRawBodies?.get(sig);
		if (!stored) {
			throw new Error(
				'Raw request body not found. Make sure the stripe-hook is enabled and running in this bundle.',
			);
		}

		const rawBody = stored.body.toString('utf8');

		// Clean up the stored entry immediately after retrieval
		global.__stripeRawBodies.delete(sig);

		// Parse the stripe-signature header
		const elements = sig.split(',');
		const timestamp = elements.find((e) => e.startsWith('t='))?.split('=')[1];
		const signatures = elements
			.filter((e) => e.startsWith('v1='))
			.map((e) => e.split('=').slice(1).join('='));

		if (!timestamp || signatures.length === 0) {
			throw new Error('Invalid stripe-signature header format.');
		}

		// Compute expected signature
		const signedPayload = `${timestamp}.${rawBody}`;
		const expectedSig = crypto
			.createHmac('sha256', webhook_secret)
			.update(signedPayload, 'utf8')
			.digest('hex');

		// Constant-time comparison against all v1 signatures
		const isValid = signatures.some((s) => {
			try {
				return crypto.timingSafeEqual(
					Buffer.from(expectedSig, 'hex'),
					Buffer.from(s, 'hex'),
				);
			} catch {
				return false;
			}
		});

		if (!isValid) {
			throw new Error('Stripe signature verification failed.');
		}

		// Reject if timestamp is older than 5 minutes (replay protection)
		const now = Math.floor(Date.now() / 1000);
		if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
			throw new Error('Stripe webhook timestamp is outside the tolerance zone.');
		}

		logger.info('Stripe webhook signature verified successfully.');
		return JSON.parse(rawBody);
	},
};
