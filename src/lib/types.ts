// ===================================================================
// 1. 各機能が使用する、固有の設定とデータの型を定義する
// ===================================================================

/**
 * 好感度機能 (Function Calling) の設定とデータ
 */
export interface GoodwillFeatureData {
	currentValue: number; // 現在の好感度の合計値
	thresholds: {
		level: number;
		prompt_addon: string;
	}[];
	descriptionForAI?: string;
}

/**
 * (将来の機能追加の例) アイテム管理機能のデータ
 */
export interface InventoryFeatureData {
	isEnabled: boolean;
	items: {
		id: string;
		name: string;
		quantity: number;
	}[];
}

/**
 * カスタムステータスの型定義
 */
export interface CustomStatus {
	id: string;
	name: string;
	currentValue: string;
	mode: 'add' | 'set';
	isVisible: boolean;
}

/**
 * トリガーの単一の条件を表す型
 */
export interface TriggerCondition {
	id: string; // 条件の一意なID
	statusId: string; // どのステータスを参照するか (CustomStatusのidや固定値)
	operator: '>=' | '>' | '<=' | '<';
	value: number;
}

/**
 * 一つのトリガー全体の設定を表す型
 */
export interface Trigger {
	id: string; // トリガーの一意なID
	conditions: TriggerCondition[];
	// 条件が2つ以上ある場合、間の結合子を格納 (例: conditionsが3つならconjunctionsは2つ)
	conjunctions: ('AND' | 'OR')[];
	executionType: 'once' | 'persistent' | 'on-threshold-cross';
	responseText: string;
	// ▼▼▼ ここから追加 ▼▼▼
	hasBeenExecuted?: boolean; // 'once' タイプで使用: 既に実行されたか
	lastEvaluationResult?: boolean; // 'on-threshold-cross' で使用: 前回の評価結果
	// ▲▲▲ ここまで追加 ▲▲▲
}

// ===================================================================
// 2. すべての機能別データを格納する、拡張可能なコンテナを定義する
// ===================================================================

export interface GameViewSettings {
	imageBaseUrl: string;
	imageExtension: string;
	// customStatuses は Session 直下に移動しました
}

export interface FeatureSettings {
	apiMode: 'standard' | 'oneStepFC' | 'twoStepFC';
	goodwill?: GoodwillFeatureData;
	inventory?: InventoryFeatureData;
}

// ===================================================================
// 3. コアとなるSessionインターフェースを定義する (変更あり)
// ===================================================================
export interface AppSettings {
	apiKey: string;
	model: string;
	systemPrompt: {
		isEnabled: boolean;
		text: string;
	};
	dummyUserPrompt: {
		isEnabled: boolean;
		text: string;
	};
}

export interface Session {
	id: string;
	createdAt: string;
	lastUpdatedAt: string;
	featureSettings: FeatureSettings;
	viewMode?: 'standard' | 'game';
	gameViewSettings?: GameViewSettings;
	customStatuses?: CustomStatus[];
	triggers?: Trigger[];
	logs: {
		speaker: 'user' | 'ai';
		text: string;
		timestamp: string;
	}[];
}

// ===================================================================
// 4. APIとの通信で使用するデータ型 (変更なし)
// ===================================================================
export interface ConversationContext {
	logs: {
		speaker: 'user' | 'ai';
		text: string;
	}[];
	featureSettings: FeatureSettings;
}
