import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { del } from '@vercel/blob';

export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		throw error(401, 'Unauthorized: ログインが必要です。');
	}
	const currentUserId = session.user.id;
	const fileId = params.id;

	const { title, description, imageUrl, authorName, model } = await request.json();

	if (!title) {
		throw error(400, 'Bad Request: タイトルは必須です。');
	}

	try {
		const { rows: fileRows } = await db.sql`
			SELECT uploader_id AS "uploaderId" FROM files WHERE id = ${fileId};
		`;

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
				author_name = ${authorName},
				model = ${model}
			WHERE id = ${fileId}
			RETURNING
				id, title, description, tags, image_url AS "imageUrl",
				star_count AS "starCount", download_count AS "downloadCount",
				uploaded_at AS "uploadedAt", author_name AS "authorName",
				uploader_id AS "uploaderId", model;
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

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		throw error(401, 'Unauthorized: ログインが必要です。');
	}
	const currentUserId = session.user.id;
	const fileId = params.id;

	try {
		const { rows } = await db.sql`
			SELECT
				uploader_id AS "uploaderId",
				pathname
			FROM
				files
			WHERE id = ${fileId};
		`;

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