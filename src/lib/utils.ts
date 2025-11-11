//src/lib/utils.ts

import type { Session } from './types';

// ===================================================================
// LLMモデル関連の共通設定
// ===================================================================
/**
 * ユーザーが設定画面で選択できるGeminiモデルのリスト。
 * [モデル名, 表示名] の形式で定義します。
 */
export const availableModels = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];

const commonSafetySettings = [
	{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
	{ category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
	{ category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
	{ category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
];

const generationConfig = {
	temperature: 0.9,
	topK: 1,
	topP: 1,
	maxOutputTokens: 2048,
	stopSequences: []
};

/**
 * アプリケーション全体で使用するGeminiモデルの設定
 */
export const geminiModelConfig = {
	safetySettings: commonSafetySettings,
	generationConfig: generationConfig
};

// ===================================================================
// セッション関連のヘルパー関数
// ===================================================================

/**
 * 新しいセッションのデフォルトオブジェクトを生成して返す関数
 * @returns 新しいSessionオブジェクト
 */
export function createNewSession(): Session {
	const now = new Date().toISOString();
	return {
		id: crypto.randomUUID(),
		createdAt: now,
		lastUpdatedAt: now,
		logs: [],
		viewMode: 'standard',
		featureSettings: {
			apiMode: 'standard',
			goodwill: {
				currentValue: 0,
				thresholds: []
			}
		}
	};
}
