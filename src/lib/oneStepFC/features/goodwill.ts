// src/lib/oneStepFC/features/goodwill.ts

/**
 * 好感度機能に関するスキーマ定義を返します。
 * @param overrideDescription - デフォルトの説明文を上書きする場合に指定します。
 */
export function getGoodwillSchemaProperty(overrideDescription?: string) {
	// デフォルトの説明文をこのファイル内で定義する
	const defaultDescription = "ユーザーの発言に応じたキャラクターの好感度の変動値。ポジティブな場合は正の数、ネガティブな場合は負の数。変化がない場合は指定不要。";
	
	return {
		goodwillFluctuation: {
			type: "number",
			// 引数で上書きされればそちらを使い、なければデフォルト値を使う
			description: overrideDescription || defaultDescription
		}
	};
}