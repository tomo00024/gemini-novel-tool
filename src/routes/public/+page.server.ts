// src/routes/public/[id]/+page.server.ts

import { db } from '$lib/server/db';
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

	try {
		// ▼ 修正: SELECT に model を追加
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
                uploader_id    AS "uploaderId",
                model          -- 追加
            FROM
                files
            WHERE
                visibility = 'public'
            ORDER BY
                uploaded_at DESC;
        `;
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
};
