// src/lib/stores.ts

import { writable } from 'svelte/store';
import { browser } from '$app/environment'; // browser環境かどうかを判定するためにインポート
import type { AppSettings, Session } from './types';
import { availableModels } from './utils'; // [追加] デフォルトモデルを設定するためにインポート

// localStorageに保存するためのキーを定義
const APP_SETTINGS_KEY = 'app_settings';
const SESSIONS_KEY = 'sessions';

// --- AppSettings Store ---

// [ここから修正]
// 1. デフォルトのアプリケーション設定を定義する
// これにより、新しい設定項目（modelなど）が追加された場合でも、
// 既存ユーザーの環境で値が未定義になるのを防ぐ。
const defaultAppSettings: AppSettings = {
	apiKey: '',
	model: availableModels[0][0] // availableModelsの最初のモデルをデフォルト値とする
};

// 2. localStorageから初期値を読み込む
const storedAppSettings = browser ? localStorage.getItem(APP_SETTINGS_KEY) : null;

// 3. 読み込んだ値とデフォルト値をマージして初期値を決定する
// これにより、localStorageに古い形式のデータが残っていても、新しいプロパティが必ず存在する状態になる。
const initialAppSettings: AppSettings = storedAppSettings
	? { ...defaultAppSettings, ...JSON.parse(storedAppSettings) }
	: defaultAppSettings;

export const appSettings = writable<AppSettings>(initialAppSettings);

// 4. ストアの値が変更されたらlocalStorageに保存する (変更なし)
if (browser) {
	appSettings.subscribe((value) => {
		localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(value));
	});
}
// [ここまで修正]

// --- Sessions Store ---
// 1. localStorageから初期値を読み込む
const storedSessions = browser ? localStorage.getItem(SESSIONS_KEY) : null;
const initialSessions: Session[] = storedSessions ? JSON.parse(storedSessions) : [];

export const sessions = writable<Session[]>(initialSessions);

// 2. ストアの値が変更されたらlocalStorageに保存する
if (browser) {
	sessions.subscribe((value) => {
		localStorage.setItem(SESSIONS_KEY, JSON.stringify(value));
	});
}
