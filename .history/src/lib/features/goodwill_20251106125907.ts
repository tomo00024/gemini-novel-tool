// src/lib/features/goodwill.ts
// 好感度機能に関するスキーマ定義
export function getGoodwillSchemaProperty(description: string) {
	return {
		goodwillFluctuation: {
			type: "number",
			description: description
		}
	};
}