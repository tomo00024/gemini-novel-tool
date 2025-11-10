//src/lib/standard/geminiClient.standard.ts

import type { ConversationContext } from '$lib/types';
import { geminiModelConfig } from '$lib/utils';

// ===================================================================
// 型定義
// ===================================================================

export interface StandardChatResponse {
	responseText: string;
}

interface GeminiApiResponse {
	candidates: Array<{
		content: { parts: Array<{ text?: string }> };
	}>;
}

// ===================================================================
// ユーティリティ/ヘルパー関数群
// ===================================================================

/**
 * Gemini APIに渡す対話履歴(`contents`)を準備します。
 *
 */
function prepareGeminiContents(context: ConversationContext, userInput: string) {
	const history = context.logs.map((log) => ({
		role: log.speaker === 'user' ? 'user' : 'model',
		parts: [{ text: log.text }]
	}));
	return [...history, { role: 'user', parts: [{ text: userInput }] }];
}

/**
 * Gemini APIからのレスポンスを解析し、ChatResponse形式に変換します。
 *
 */
function parseGeminiResponse(data: GeminiApiResponse): StandardChatResponse {
	const part = data.candidates?.[0]?.content?.parts?.[0];

	if (part?.text) {
		return { responseText: part.text };
	}

	// 予期せぬレスポンス形式の場合
	console.error('Unexpected API response format:', data);
	return { responseText: '予期せぬ形式の応答がありました。' };
}

// ===================================================================
// Gemini API を呼び出すメイン関数 (リファクタリング後)
// ===================================================================
export async function callGeminiApiOnClient(
	apiKey: string,
	model: string,
	context: ConversationContext,
	userInput: string
): Promise<StandardChatResponse> {
	const contents = prepareGeminiContents(context, userInput);
	const requestBody = {
		contents,
		safetySettings: geminiModelConfig.safetySettings,
		generationConfig: geminiModelConfig.generationConfig
	};
	const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

	try {
		const response = await fetch(API_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(requestBody)
		});

		if (!response.ok) {
			const errorBody = await response.json();
			console.error('Gemini API Error:', errorBody.error.message);
			return { responseText: `APIエラーが発生しました: ${errorBody.error.message}` };
		}

		const data = (await response.json()) as GeminiApiResponse;
		return parseGeminiResponse(data);
	} catch (error) {
		console.error('Network or other error calling Gemini API:', error);
		const errorMessage = error instanceof Error ? error.message : '不明なエラー';
		return { responseText: `通信エラーが発生しました: ${errorMessage}` };
	}
}
