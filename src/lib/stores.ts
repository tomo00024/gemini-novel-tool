// src/lib/stores.ts

import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { AppSettings, Session } from './types';
import { availableModels } from './utils';

const APP_SETTINGS_KEY = 'app_settings';
const SESSIONS_KEY = 'sessions';

// 1. デフォルトのアプリケーション設定を定義する
const defaultAppSettings: AppSettings = {
	apiKey: '',
	model: availableModels[0],
	systemPrompt: {
		isEnabled: false,
		text: ''
	},
	dummyUserPrompt: {
		isEnabled: false,
		text: ''
	}
};

// 2. localStorageから初期値を読み込む
const storedAppSettingsJSON = browser ? localStorage.getItem(APP_SETTINGS_KEY) : null;

let initialAppSettings: AppSettings = defaultAppSettings;

if (storedAppSettingsJSON) {
	const parsedSettings = JSON.parse(storedAppSettingsJSON);

	// デフォルト値とマージして、新しいプロパティが欠落しないようにする
	const mergedSettings = { ...defaultAppSettings, ...parsedSettings };

	// 古いデータ形式（プロンプトがただの文字列）からの移行処理
	if (typeof mergedSettings.systemPrompt === 'string') {
		mergedSettings.systemPrompt = {
			isEnabled: !!mergedSettings.systemPrompt, // 文字列があればtrue
			text: mergedSettings.systemPrompt
		};
	}
	if (typeof mergedSettings.dummyUserPrompt === 'string') {
		mergedSettings.dummyUserPrompt = {
			isEnabled: !!mergedSettings.dummyUserPrompt, // 文字列があればtrue
			text: mergedSettings.dummyUserPrompt
		};
	}
	initialAppSettings = mergedSettings;
}

export const appSettings = writable<AppSettings>(initialAppSettings);

// 4. ストアの値が変更されたらlocalStorageに保存する
if (browser) {
	appSettings.subscribe((value) => {
		localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(value));
	});
}

// --- Sessions Store ---
const storedSessions = browser ? localStorage.getItem(SESSIONS_KEY) : null;
const initialSessions: Session[] = storedSessions ? JSON.parse(storedSessions) : [];

export const sessions = writable<Session[]>(initialSessions);

if (browser) {
	sessions.subscribe((value) => {
		localStorage.setItem(SESSIONS_KEY, JSON.stringify(value));
	});
}
