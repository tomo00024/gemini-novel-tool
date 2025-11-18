// src/routes/public/[id]/+page.server.ts

// createPoolの代わりに共有プールdbをインポート
import { db } from '$lib/server/db';
// --- 修正箇所 (ここまで) ---
import type { PageServerLoad } from './$types';
import { POSTGRES_URL } from '$env/static/private';

export const load: PageServerLoad = async ({ locals }) => {
	const session = await locals.auth();

	if (!POSTGRES_URL) {
		return {
			files: [],
			error: 'データベース接続文字列が設定されていません。',
			session
		};
	}

	// --- 修正箇所 ---
	// リクエストごとにプールを作成するコードを削除
	// const pool = createPool({ ... });

	try {
		// --- 修正箇所 (ここから) ---
		// DBのカラム名をsnake_caseに修正
		// AS "camelCase" を使うことで、Svelte側に渡すデータ構造は変わらない
		const result = await db.sql`
            SELECT
                id,
                title,
                description,
                tags,
                image_url      AS "imageUrl",
                star_count     AS "starCount",
                download_count AS "downloadCount",
                uploaded_at    AS "uploadedAt",
                author_name    AS "authorName",
                uploader_id    AS "uploaderId" 
            FROM
                files
            WHERE
                visibility = 'public'
            ORDER BY
                uploaded_at DESC;
        `;
		// --- 修正箇所 (ここまで) ---
		return {
			files: result.rows,
			session
		};
	} catch (error) {
		console.error('データベースからのデータ取得に失敗しました:', error);
		return {
			files: [],
			error: 'データベースからのデータ取得に失敗しました。',
			session
		};
	}
	// --- 修正箇所 ---
	// 共有プールは絶対に閉じない！ finallyブロック全体を削除
};
