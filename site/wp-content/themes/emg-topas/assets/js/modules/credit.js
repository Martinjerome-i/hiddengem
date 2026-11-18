/**
 * Credits and interactive bubbles for Hidden Gem Cafe.
 */
const LINES = {
	emedias: [
		null,
		'Welcome to Hidden Gem Cafe in Pollachi! Love what you see?',
		null,
		'Slow-churned scoops, crispy bites, and pure cafe happiness.',
		null,
		'Still here? Our artisanal scoops and milkshakes are waiting for you!',
		'A little place. A lot of flavour. Visit us today in Pollachi!',
	],
	piqo: [
		null,
		'Every recipe is crafted with care and passion.',
		null,
		'Made fresh to order with quality ingredients.',
		null,
		'Hidden Gem Cafe is your favourite neighbourhood escape.',
		'Good food. Great moments. Welcome to Hidden Gem!',
	],
};

export function initCredit() {
	document.querySelectorAll('[data-credit]').forEach((link) => {
		const bubble = link.querySelector('[data-credit-bubble]');
		const lines = LINES[link.dataset.credit] || [];
		if (!bubble || !lines.length) return;
		let count = 0;
		let timer = 0;
		link.addEventListener('pointerenter', () => {
			const line = lines[count % lines.length];
			count++;
			if (!line) return;
			bubble.textContent = line;
			bubble.classList.add('is-on');
			clearTimeout(timer);
			timer = setTimeout(() => bubble.classList.remove('is-on'), 3800);
		});
	});
}
