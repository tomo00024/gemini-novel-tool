// src/routes/api/upload/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { put, del } from '@vercel/blob'; // ファイル削除のために `del` をインポート
import { db } from '$lib/server/db';
import { v4 as uuidv4 } from 'uuid';
import { BLOB_READ_WRITE_TOKEN } from '$env/static/private';
import { uploadSchema } from '$lib/schemas/upload';

// アプリケーションで許容するJSONデータの最大サイズ (例: 1MB)
const MAX_JSON_SIZE_BYTES = 1 * 1024 * 1024;

export const POST: RequestHandler = async ({ request, locals }) => {
	// 1. ユーザー認証の確認
	const session = await locals.auth();
	if (!session?.user?.id) {
		throw error(401, 'Unauthorized: ログインが必要です。');
	}
	const uploaderId = session.user.id;

	// 2. リクエストボディの解析とZodによる厳格な入力値検証
	const body = await request.json();
	const validationResult = uploadSchema.safeParse(body);

	if (!validationResult.success) {
		// 検証に失敗した場合、具体的なエラー内容をクライアントに返す
		return json(
			{
				message: '入力内容に誤りがあります。',
				errors: validationResult.error.flatten().fieldErrors
			},
			{ status: 400 } // 400 Bad Request
		);
	}

	// 検証済みの安全なデータを取得
	const { sessionData, title, description, imageUrl, expiresAt, authorName } =
		validationResult.data;

	const fileContent = JSON.stringify(sessionData);
	const fileSize = Buffer.byteLength(fileContent, 'utf-8');

	// 3. ファイルサイズの制限チェック
	if (fileSize > MAX_JSON_SIZE_BYTES) {
		throw error(
			413,
			`Payload Too Large: ファイルサイズは${MAX_JSON_SIZE_BYTES / 1024 / 1024}MB以内にしてください。`
		); // 413 Payload Too Large
	}

	const blobPathname = `${uploaderId}/${uuidv4()}.json`;
	let blobUrl: string | null = null; // 失敗時に削除するため、URLを保持する変数

	try {
		// --- ここからが重要な処理ブロック ---
		// 4. Vercel Blobへのファイルアップロード (最初の外部システム書き込み)
		const blob = await put(blobPathname, fileContent, {
			access: 'public',
			contentType: 'application/json',
			token: BLOB_READ_WRITE_TOKEN
		});

		// 後続の処理が失敗した場合に備えて、作成したBlobのURLを保存
		blobUrl = blob.url;

		const finalFileName = `${title}.json`;
		const fileId = uuidv4();

		try {
			// 5. データベースへのレコード挿入 (2番目の外部システム書き込み)
			await db.sql`
				INSERT INTO files (
					id, title, description, image_url, author_name,
					file_name, blob_url, pathname, content_type, size_bytes,
					expires_at, uploader_id, visibility
				) VALUES (
					${fileId}, ${title}, ${description}, ${imageUrl}, ${authorName},
					${finalFileName},
                    ${blob.url}, ${blob.pathname}, ${blob.contentType}, ${fileSize},
					${expiresAt}, ${uploaderId}, 'public'
				)
			`;

			// 6. すべての処理が成功した場合、成功レスポンスを返す
			return json(
				{
					message: 'アップロードが成功しました。',
					id: fileId,
					url: blob.url
				},
				{ status: 201 } // 201 Created
			);
		} catch (dbError) {
			// データベースへの書き込みが失敗した場合の処理
			console.error('Database Insert Error:', dbError);

			// --- 原子性を担保するためのクリーンアップ処理 ---
			if (blobUrl) {
				console.log(`Attempting to delete orphaned blob: ${blobUrl}`);
				await del(blobUrl, { token: BLOB_READ_WRITE_TOKEN });
				console.log('Orphaned blob deleted successfully.');
			}
			// ---------------------------------------------

			throw error(500, 'Internal Server Error: データベースへの保存中にエラーが発生しました。');
		}
	} catch (e: any) {
		// Vercel Blobへのアップロード失敗など、予期せぬエラー全般をここで捕捉
		console.error('Upload Process Error:', e);

		// SvelteKitの`error`オブジェクトがスローされた場合は、それをそのまま再スロー
		if (e.status) {
			throw e;
		}

		// それ以外の一般的なエラー
		throw error(500, 'Internal Server Error: ファイルの処理中に予期せぬエラーが発生しました。');
	}
};
