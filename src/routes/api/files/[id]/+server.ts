// src/routes/api/files/[id]/+server.ts
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
// `sql`の代わりに`createPool`をインポートする
import { createPool } from '@vercel/postgres';
import { del } from '@vercel/blob';
// POSTGRES_URLをインポートする
import { POSTGRES_URL } from '$env/static/private';

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

	// データベース接続プールを作成
	const db = createPool({ connectionString: POSTGRES_URL }); // ← 追加

	try {
		// 権限チェックのためにuploaderIdを取得
		const { rows: fileRows } = await db.sql`
			SELECT uploaderid AS "uploaderId" FROM files WHERE id = ${fileId};
		`;

		const file = fileRows[0];
		if (!file) {
			throw error(404, 'Not Found: 指定されたファイルが見つかりません。');
		}
		if (file.uploaderId !== currentUserId) {
			throw error(403, 'Forbidden: このファイルを編集する権限がありません。');
		}

		// データベースを更新
		const { rows: updatedRows } = await db.sql`
			UPDATE files
			SET
				title = ${title},
				description = ${description},
				imageUrl = ${imageUrl},
				authorName = ${authorName}
			WHERE id = ${fileId}
			RETURNING
				id, title, description, tags, imageurl AS "imageUrl",
				starcount AS "starCount", downloadcount AS "downloadCount",
				uploadedat AS "uploadedAt", authorname AS "authorName",
				uploaderid AS "uploaderId";
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

	// データベース接続プールを作成
	const db = createPool({ connectionString: POSTGRES_URL }); // ← 追加

	try {
		// ファイル情報を取得
		const { rows } = await db.sql`
			SELECT
				uploaderid AS "uploaderId",
				pathname
			FROM
				files
			WHERE id = ${fileId};
		`;

		const file = rows[0];
		if (!file) {
			throw error(404, 'Not Found: 指定されたファイルが見つかりません。');
		}

		// 権限チェック
		if (file.uploaderId !== currentUserId) {
			throw error(403, 'Forbidden: このファイルを削除する権限がありません。');
		}

		// Blobストレージからファイルを削除
		if (file.pathname) {
			await del(file.pathname);
		}

		// データベースからレコードを削除
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
