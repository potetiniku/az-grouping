// リソースグループの概要のブレードで、コマンドバーの「グループ化」ドロップダウンを開いて「種類」を自動選択する。
// React化により概要ブレードはクロスオリジンiframeにあるため、all_framesで全フレームに注入し、対象DOMが見つかったフレームでだけ動く。

// 設定
const CONFIG = {
	// 選びたいグループ化項目（テキスト正規表現）。「場所」にしたければ /(場所|Location)/。
	TARGET_LABEL: /(種類|Type)/i,
	// 「グループ化」ボタンと識別するための語
	TRIGGER_ALLOW: /(グループ化|Group\s*by)/i,
	// 紛らわしいボタン（削除等）を除外
	TRIGGER_DENY: /(削除|Delete|リソース|Resource)/i,
	// メニュー出現待ち
	MENU_WAIT_MS: 5000,
	POLL_INTERVAL_MS: 100,
	RETRY_DELAY_MS: 300,
};

// ユーティリティ
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function simulateClick(el) {
	if (!el) return;
	const opts = { bubbles: true, cancelable: true, clientX: 0, clientY: 0, button: 0 };
	el.dispatchEvent(new PointerEvent('pointerdown', opts));
	el.dispatchEvent(new MouseEvent('mousedown', opts));
	el.dispatchEvent(new PointerEvent('pointerup', opts));
	el.dispatchEvent(new MouseEvent('mouseup', opts));
	el.dispatchEvent(new MouseEvent('click', opts));
}

const labelOf = (el) => `${el.getAttribute('aria-label') || ''} ${(el.textContent || '').trim()}`;
const isVisible = (el) => el.offsetParent !== null;

// DOM探索
function findGroupByTrigger() {
	for (const el of document.querySelectorAll('[aria-haspopup]')) {
		const s = labelOf(el);
		if (CONFIG.TRIGGER_ALLOW.test(s) && !CONFIG.TRIGGER_DENY.test(s)) return el;
	}
	return null;
}

function isAlreadySelected(trigger) {
	const s = labelOf(trigger);
	return CONFIG.TARGET_LABEL.test(s) && !/なし|None/i.test(s);
}

function getMenuItems() {
	return [...document.querySelectorAll(
		'[role="menuitem"], [role="menuitemradio"], [role="option"]'
	)].filter(isVisible);
}

function findTargetItem(items) {
	return items.find((el) => {
		const t = (el.textContent || '').trim();
		return CONFIG.TARGET_LABEL.test(t) && !CONFIG.TRIGGER_DENY.test(t);
	});
}

// メインフロー
let busy = false;
let doneOnce = false;

async function applyGroupBy() {
	if (busy || doneOnce) return;
	busy = true;
	try {
		const trigger = findGroupByTrigger();
		if (!trigger) return;

		if (isAlreadySelected(trigger)) {
			doneOnce = true;
			return;
		}

		simulateClick(trigger);

		// メニューが出るまでポーリング
		const deadline = Date.now() + CONFIG.MENU_WAIT_MS;
		let items = [];
		while (Date.now() < deadline) {
			items = getMenuItems();
			if (items.length >= 2) break;
			await sleep(CONFIG.POLL_INTERVAL_MS);
		}
		if (items.length < 2) return;

		const target = findTargetItem(items);
		if (!target) return;

		simulateClick(target);
		doneOnce = true;
	} finally {
		busy = false;
	}
}

// 起動・トリガ
let lastHref = '';
function schedule() {
	if (location.href !== lastHref) {
		lastHref = location.href;
		doneOnce = false;
	}
	setTimeout(applyGroupBy, CONFIG.RETRY_DELAY_MS);
}

new MutationObserver(schedule).observe(document.documentElement, {
	childList: true,
	subtree: true,
});

window.addEventListener('hashchange', schedule);
window.addEventListener('popstate', schedule);
schedule();
