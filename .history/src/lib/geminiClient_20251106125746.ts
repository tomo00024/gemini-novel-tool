//geminiClient.ts
import type { ConversationContext, GoodwillFeatureData } from '$lib/types';
import { geminiModelConfig } from '$lib/utils';
import { getGoodwillSchemaProperty } from './features/goodwill';
import { getInventorySchemaProperty } from './features/inventory';

// ===================================================================
// 型定義 (変更なし)
// ===================================================================
interface GenerateResponseArgs {
	responseText: string;
	goodwillFluctuation?: number;
}
export interface ChatResponse {
	responseText: string;
	goodwillFluctuation: number;
}
interface GeminiApiResponse {
    candidates: Array<{
        content: { parts: Array<{ text?: string; functionCall?: { name: string; args: GenerateResponseArgs; }; }> };
    }>;
}

// ===================================================================
// ユーティリティ/ヘルパー関数群
// ===================================================================

/**
 * Function Callingの`tools`定義を、有効な機能に基づいて動的に構築します。
 * この関数は各機能の詳細を知りません。
 */
function buildGeminiTools(context: ConversationContext) {
	const baseProperties = {
		responseText: {
			type: "string",
			description: 'ユーザーへの応答として生成されたテキストメッセージ。'
		}
	};
	
	let combinedProperties: Record<string, any> = { ...baseProperties };
	let isAnyFeatureEnabled = false;

	// --- ここが動的なアドオン処理部分 ---

	// 1. 好感度機能が有効（チェックボックスON）なら、スキーマを追加
	const goodwillSettings = context.featureSettings.goodwill;
	if (goodwillSettings?.isEnabled) {
		const description = goodwillSettings.descriptionForAI || '（好感度の説明）';
		const goodwillSchema = getGoodwillSchemaProperty(description);
		combinedProperties = { ...combinedProperties, ...goodwillSchema };
		isAnyFeatureEnabled = true;
	}

	// 2. インベントリ機能が有効（チェックボックスON）なら、スキーマを追加
	const inventorySettings = context.featureSettings.inventory; // contextの型も拡張が必要
	if (inventorySettings?.isEnabled) {
		const inventorySchema = getInventorySchemaProperty();
		combinedProperties = { ...combinedProperties, ...inventorySchema };
		isAnyFeatureEnabled = true;
	}

    // 3. 将来的に他の機能を追加する場合も、ここに if ブロックを追加するだけ
    // if (context.featureSettings.weather?.isEnabled) { ... }


	// --- 組み立て処理 ---
	if (!isAnyFeatureEnabled) {
		return undefined;
	}

	return [{
        functionDeclarations: [{
            name: 'generateResponse',
            description: 'ユーザーへの応答と、それに伴う状態変化をまとめて生成します。',
            parameters: {
                type: 'OBJECT', 
                properties: combinedProperties,
                required: ['responseText'] // responseTextだけは必須
            }
        }]
    }];
}

/**
 * Gemini APIに渡す対話履歴(`contents`)を準備します。
 */
function prepareGeminiContents(context: ConversationContext, userInput: string) {
	const history = context.logs.map((log) => ({
		role: log.speaker === 'user' ? 'user' : 'model',
		parts: [{ text: log.text }]
	}));

	let finalPrompt = userInput;
	const goodwillSettings = context.featureSettings.goodwill;
	if (goodwillSettings?.isEnabled && goodwillSettings.thresholds) {
		// processGoodwillのロジックをここに統合・簡略化
		const sortedThresholds = [...goodwillSettings.thresholds].sort((a, b) => b.level - a.level);
		const applicableThreshold = sortedThresholds.find(
			(t) => goodwillSettings.currentValue >= t.level
		);
		if (applicableThreshold) {
			finalPrompt = `${applicableThreshold.prompt_addon} ${userInput}`;
		}
	}

    return [...history, { role: 'user', parts: [{ text: finalPrompt }] }];
}

/**
 * Gemini APIからのレスポンスを解析し、ChatResponse形式に変換します。
 */
function parseGeminiResponse(data: GeminiApiResponse): ChatResponse {
	const part = data.candidates?.[0]?.content?.parts?.[0];

	if (part?.functionCall?.name === 'generateResponse') {
		const args = part.functionCall.args;
		return {
			responseText: args.responseText,
			goodwillFluctuation: args.goodwillFluctuation ?? 0
		};
	}
	
	if (part?.text) {
		// Function Callingが使われなかった場合のフォールバック
		return { responseText: part.text, goodwillFluctuation: 0 };
	}

	// 予期せぬレスポンス形式の場合
	console.error("Unexpected API response format:", data);
	return { responseText: '予期せぬ形式の応答がありました。', goodwillFluctuation: 0 };
}

// ===================================================================
// Gemini API を呼び出すメイン関数 (リファクタリング後)
// ===================================================================
export async function callGeminiApiOnClient(
	apiKey: string,
	context: ConversationContext,
	userInput: string
): Promise<ChatResponse> {

	// 1. リクエストに必要な各パーツをヘルパー関数で構築
	const tools = buildGeminiTools(context);
	const contents = prepareGeminiContents(context, userInput);
	const requestBody = {
        contents,
        tools,
        safetySettings: geminiModelConfig.safetySettings
    };
	const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModelConfig.model}:generateContent?key=${apiKey}`;
	try {
        // 2. API呼び出しの実行
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error('Gemini API Error:', errorBody.error.message);
            return { responseText: `APIエラーが発生しました: ${errorBody.error.message}`, goodwillFluctuation: 0 };
        }

        // 3. レスポンスの解析
        const data = await response.json() as GeminiApiResponse;
        return parseGeminiResponse(data);

	} catch (error) {
        // 4. 通信エラーのハンドリング
        console.error('Network or other error calling Gemini API:', error);
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        return { responseText: `通信エラーが発生しました: ${errorMessage}`, goodwillFluctuation: 0 };
    }
}