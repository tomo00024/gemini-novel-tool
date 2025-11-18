// src/routes/api/files/[id]/+server.ts
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
// --- 修正箇所 (ここから) ---
// `createPool`と`POSTGRES_URL`の代わりに共有プール`db`をインポート
import { db } from '$lib/server/db';
// --- 修正箇所 (ここまで) ---
import { del } from '@vercel/blob';

// --- PATCHハンドラの修正 ---
export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		throw error(401, 'Unauthorized: ログインが必要です。');
	}
	const currentUserId = session.user.id;
	const fileId = params.id;

	const { title, description, imageUrl, authorName } = await request.json();

	if (!title) {
		throw error(400, 'Bad Request: タイトルは必須です。');
	}

	// --- 修正箇所 ---
	// リクエストごとにプールを作成するコードを削除
	// const db = createPool({ connectionString: POSTGRES_URL });

	try {
		// 権限チェックのためにuploaderIdを取得 (共有プール`db`を使用)
		const { rows: fileRows } = await db.sql`
			SELECT uploaderid AS "uploaderId" FROM files WHERE id = ${fileId};
		`;

		// ... (以降の処理は変更なし)
		const file = fileRows[0];
		if (!file) {
			throw error(404, 'Not Found: 指定されたファイルが見つかりません。');
		}
		if (file.uploaderId !== currentUserId) {
			throw error(403, 'Forbidden: このファイルを編集する権限がありません。');
		}

		const { rows: updatedRows } = await db.sql`
			UPDATE files
			SET
				title = ${title},
				description = ${description},
				image_url = ${imageUrl},
				author_name = ${authorName}
			WHERE id = ${fileId}
			RETURNING
				id, title, description, tags, image_url AS "imageUrl",
				star_count AS "starCount", download_count AS "downloadCount",
				uploaded_at AS "uploadedAt", author_name AS "authorName",
				uploader_id AS "uploaderId";
		`;

		return json(updatedRows[0], { status: 200 });
	} catch (e: any) {
		console.error('File Update Error:', e);
		if (e.status) {
			throw e;
		}
		throw error(500, 'Internal Server Error: ファイルの更新中にエラーが発生しました。');
	}
};

// --- DELETEハンドラの修正 ---
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		throw error(401, 'Unauthorized: ログインが必要です。');
	}
	const currentUserId = session.user.id;
	const fileId = params.id;

	// --- 修正箇所 ---
	// リクエストごとにプールを作成するコードを削除
	// const db = createPool({ connectionString: POSTGRES_URL });

	try {
		// ファイル情報を取得 (共有プール`db`を使用)
		const { rows } = await db.sql`
			SELECT
				uploaderid AS "uploaderId",
				pathname
			FROM
				files
			WHERE id = ${fileId};
		`;

		// ... (以降の処理は変更なし)
		const file = rows[0];
		if (!file) {
			throw error(404, 'Not Found: 指定されたファイルが見つかりません。');
		}

		if (file.uploaderId !== currentUserId) {
			throw error(403, 'Forbidden: このファイルを削除する権限がありません。');
		}

		if (file.pathname) {
			await del(file.pathname);
		}

		await db.sql`
			DELETE FROM files WHERE id = ${fileId};
		`;

		return json({ message: 'ファイルが正常に削除されました。' }, { status: 200 });
	} catch (e: any) {
		console.error('File Deletion Error:', e);
		if (e.status) {
			throw e;
		}
		throw error(500, 'Internal Server Error: ファイルの削除中にエラーが発生しました。');
	}
};
