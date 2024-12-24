function waitForElement(selector, timeout = 10000) {
	return new Promise((resolve, reject) => {
		const observer = new MutationObserver((mutationsList, observer) => {
			if (document.querySelector(selector)) {
				observer.disconnect();
				resolve(document.querySelector(selector));
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true,
		});

		setTimeout(() => {
			observer.disconnect();
			reject(new Error(`Timeout waiting for element: ${selector}`));
		}, timeout);
	});
}

function dispatchClickEvent(selector) {
	const element = document.querySelector(selector);
	element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, clientX: 0, clientY: 0 }));
	element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 0, clientY: 0 }));
}

new MutationObserver(mutations => {
	mutations.forEach(mutation => {
		if (mutation.type === 'childList') {
			const resourceGroupRegex = /https:\/\/portal.azure.com\/.+\/resource\/subscriptions\/.+\/resourceGroups\/.+\/overview/;
			if (!resourceGroupRegex.test(window.location.href)) return;

			const comboboxSelector = '.azc-formControl.azc-input.fxc-dropdown-open.msportalfx-tooltip-overflow.azc-validation-border.fxc-dropdown-input:nth-of-type(1)'
			const groupByTypeSelector = '.fxc-dropdown-option.msportalfx-tooltip-overflow.fxs-portal-hover:nth-of-type(2)';

			waitForElement(comboboxSelector).then((element) => {
				dispatchClickEvent(comboboxSelector);
				dispatchClickEvent(groupByTypeSelector);
			});
		}
	});
}).observe(document.querySelector('title'), {
	childList: true,
});
