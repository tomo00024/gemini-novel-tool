import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { put } from '@vercel/blob';
// `sql`の代わりに`createPool`をインポートする
import { createPool } from '@vercel/postgres'; // ← 変更
import { v4 as uuidv4 } from 'uuid';
// POSTGRES_URLもインポートする
import { BLOB_READ_WRITE_TOKEN, POSTGRES_URL } from '$env/static/private'; // ← 変更

export const POST: RequestHandler = async ({ request, locals }) => {
	const session = await locals.auth();
	if (!session?.user?.id) {
		throw error(401, 'Unauthorized: ログインが必要です。');
	}
	const uploaderId = session.user.id;

	const body = await request.json();
	const { sessionData, publishScope, title, description, imageUrl, expiresAt, authorName } = body;

	if (!sessionData || !title || !publishScope) {
		throw error(400, 'Bad Request: 必須項目が不足しています。');
	}

	try {
		const fileContent = JSON.stringify(sessionData);
		const fileSize = Buffer.byteLength(fileContent, 'utf-8');

		const blobPathname = `${uploaderId}/${uuidv4()}.json`;
		const blob = await put(blobPathname, fileContent, {
			access: 'public',
			contentType: 'application/json',
			token: BLOB_READ_WRITE_TOKEN
		});

		const finalFileName = `${title || 'untitled'}.json`;
		const fileId = uuidv4();

		// ★★★ ここからが修正箇所 ★★★
		// 環境変数から読み込んだ接続文字列を使って、データベース接続プールを作成
		const db = createPool({
			connectionString: POSTGRES_URL
		});

		// 作成したプールから`sql`関数を取得してクエリを実行
		await db.sql`
			INSERT INTO files (
				id, title, description, imageUrl, authorName,
				fileName, blobUrl, pathname, contentType, size,
				expiresAt, uploaderId, visibility
			) VALUES (
				${fileId}, ${title}, ${description}, ${imageUrl}, ${authorName},
				${finalFileName},
                ${blob.url}, ${blob.pathname}, ${blob.contentType}, ${fileSize},
				${expiresAt}, ${uploaderId}, 'public'
			)
		`;
		// ★★★ 修正箇所ここまで ★★★

		return json(
			{
				message: 'アップロードが成功しました。',
				id: fileId,
				url: blob.url
			},
			{ status: 201 }
		);
	} catch (e: any) {
		console.error('Upload Error:', e);
		throw error(500, 'Internal Server Error: ファイルの処理中にエラーが発生しました。');
	}
};
