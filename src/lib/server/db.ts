// src/lib/server/db.ts
import { createPool } from '@vercel/postgres';
import { POSTGRES_URL } from '$env/static/private';

// アプリケーション全体で共有されるデータベース接続プール
// この createPool はアプリケーションのライフサイクルで一度しか呼び出されません。
export const db = createPool({
	connectionString: POSTGRES_URL
});
