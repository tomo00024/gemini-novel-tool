// インベントリ機能に関するスキーマ定義
export function getInventorySchemaProperty() {
	return {
		itemChange: {
			type: "object",
			description: "ユーザーとの対話によってキャラクターの所持アイテムが変化した場合に指定します。",
			properties: {
				itemName: { type: "string", description: "変化したアイテムの名前" },
				quantity: { type: "number", description: "変化した数量。アイテムを得た場合は正の数、失った場合は負の数。" }
			},
			required: ["itemName", "quantity"]
		}
	};
}