//src/lib/utils/messageProcessor.ts

/**
 * ページごとのデータを表現する型定義
 */
export type PageData = {
	text: string;
	backgroundUrl?: string;
	characterUrl?: string;
};

/**
 * processMessageIntoPages関数の戻り値の型
 */
export type ProcessedMessage = {
	pages: PageData[];
	/**
	 * メッセージから抽出されたステータスの更新情報。
	 * 例: { "HP": "100", "好感度": "+1" }
	 */
	statusUpdates: Record<string, string>;
};

type TextMeasurer = (text: string) => number;

type ProcessOptions = {
	maxHeight: number;
	measureTextHeight: TextMeasurer;
	imageBaseUrl: string;
	imageExtension: string;
};

/**
 * 生のAIメッセージを解析し、ページ分割されたデータ配列とメタデータを生成する
 */
export function processMessageIntoPages(
	rawMessage: string,
	options: ProcessOptions
): ProcessedMessage {
	const { maxHeight, measureTextHeight, imageBaseUrl, imageExtension } = options;
	const finalPages: PageData[] = [];
	const commandRegex = /({{\s*[^:]+?\s*:\s*.+?\s*}})/g;

	let pendingCommands: { bg?: string; char?: string } = {};
	const statusUpdates: Record<string, string> = {};

	const pushPage = (text: string) => {
		if (!text.trim()) {
			return;
		}
		finalPages.push({
			text: text,
			backgroundUrl: pendingCommands.bg,
			characterUrl: pendingCommands.char
		});
		pendingCommands = {};
	};

	const primaryBreakChars = ['。', '！', '？'];
	const trailingChars = ['。', '」', '）', '！', '？'];
	const paragraphs = rawMessage.split(/\n+/).filter((p) => p.trim() !== '');

	for (const paragraph of paragraphs) {
		const parts = paragraph.split(commandRegex).filter(Boolean);
		let currentPageContent = '';
		let tempContent = '';

		for (const part of parts) {
			if (part.match(commandRegex)) {
				const match = part.match(/{{\s*([^:]+?)\s*:\s*(.+?)\s*}}/);
				if (match) {
					const [, typeStr, valueStr] = match;
					const type = typeStr.trim();
					const value = valueStr.trim();
					if (type === '背景' || type === '人物') {
						const path = value
							.split('|')
							.map((p) => encodeURIComponent(p.trim()))
							.join('/');
						const ext = imageExtension.startsWith('.') ? imageExtension : `.${imageExtension}`;
						const finalUrl = `${imageBaseUrl}/${path}${ext}`;
						if (type === '背景') pendingCommands.bg = finalUrl;
						else if (type === '人物') pendingCommands.char = finalUrl;
					} else {
						// 「背景」「人物」以外はすべてステータス更新として扱う
						statusUpdates[type] = value;
					}
				}
				continue;
			}

			// テキストのページ分割処理
			const characters = part.split('');
			for (let i = 0; i < characters.length; i++) {
				tempContent += characters[i];
				if (measureTextHeight(tempContent) > maxHeight) {
					let bestSplitIndex = -1;
					for (let j = currentPageContent.length - 1; j >= 0; j--) {
						const char = currentPageContent[j];
						if (primaryBreakChars.includes(char)) {
							let sentenceEndIndex = j;
							for (let k = j + 1; k < currentPageContent.length; k++) {
								if (trailingChars.includes(currentPageContent[k])) sentenceEndIndex = k;
								else break;
							}
							const substringToCheck = currentPageContent.substring(0, sentenceEndIndex + 1);
							const openKakko = (substringToCheck.match(/「/g) || []).length;
							const closeKakko = (substringToCheck.match(/」/g) || []).length;
							const openMaruKakko = (substringToCheck.match(/（/g) || []).length;
							const closeMaruKakko = (substringToCheck.match(/）/g) || []).length;
							if (openKakko <= closeKakko && openMaruKakko <= closeMaruKakko) {
								bestSplitIndex = j;
								break;
							}
						}
					}
					if (bestSplitIndex !== -1) {
						let finalSplitIndex = bestSplitIndex;
						for (let j = bestSplitIndex + 1; j < currentPageContent.length; j++) {
							if (trailingChars.includes(currentPageContent[j])) finalSplitIndex = j;
							else break;
						}
						const pageText = currentPageContent.substring(0, finalSplitIndex + 1);
						const remainingText = currentPageContent.substring(finalSplitIndex + 1);
						pushPage(pageText);
						tempContent = remainingText + characters[i];
					} else {
						pushPage(currentPageContent);
						tempContent = characters[i];
					}
				}
				currentPageContent = tempContent;
			}
		}
		if (currentPageContent) {
			pushPage(currentPageContent);
		}
	}

	if ((pendingCommands.bg || pendingCommands.char) && finalPages.length > 0) {
		const lastPage = finalPages[finalPages.length - 1];
		if (!lastPage.backgroundUrl) lastPage.backgroundUrl = pendingCommands.bg;
		if (!lastPage.characterUrl) lastPage.characterUrl = pendingCommands.char;
	} else if ((pendingCommands.bg || pendingCommands.char) && finalPages.length === 0) {
		finalPages.push({
			text: '',
			backgroundUrl: pendingCommands.bg,
			characterUrl: pendingCommands.char
		});
	}

	return {
		pages: finalPages.length > 0 ? finalPages : [{ text: '' }],
		statusUpdates: statusUpdates
	};
}
