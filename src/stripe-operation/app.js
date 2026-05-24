export default {
	id: 'stripe-verify-signature',
	name: 'Verify Stripe Signature',
	icon: 'verified_user',
	description: 'Verifies the Stripe webhook signature using the raw request body and your endpoint signing secret.',
	overview: ({ webhook_secret }) => [
		{
			label: 'Webhook Secret',
			text: webhook_secret ? '••••••••' : 'Not configured',
		},
	],
	options: [
		{
			field: 'webhook_secret',
			name: 'Webhook Signing Secret',
			type: 'string',
			meta: {
				width: 'full',
				interface: 'input',
				note: 'Your Stripe webhook endpoint signing secret (whsec_…). Supports dynamic values like {{$env.STRIPE_WEBHOOK_SECRET}}.',
				options: {
					masked: true,
				},
			},
		},
	],
};
