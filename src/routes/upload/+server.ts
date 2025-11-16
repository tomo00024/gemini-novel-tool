// src/routes/upload/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { put } from '@vercel/blob';
import { sql } from '@vercel/postgres';
import { v4 as uuidv4 } from 'uuid';

export const POST: RequestHandler = async ({ request, locals }) => {
	// 1. 認証状態のチェック
	const session = await locals.auth();
	if (!session?.user?.id) {
		throw error(401, 'Unauthorized: ログインが必要です。');
	}
	const uploaderId = session.user.id;

	// 2. リクエスト内容の解析
	const body = await request.json();
	const { sessionData, publishScope, title, description, imageUrl, expiresAt } = body;

	if (!sessionData || !title || !publishScope) {
		throw error(400, 'Bad Request: 必須項目が不足しています。');
	}

	try {
		// ★ 変更点 1: アップロードする内容を先に文字列に変換する
		const fileContent = JSON.stringify(sessionData);
		// ★ 変更点 2: Bufferを使い、アップロード前にファイルサイズをバイト単位で計算する
		const fileSize = Buffer.byteLength(fileContent, 'utf-8');

		// 3. セッションデータをJSONファイルとしてVercel Blobにアップロード
		const fileName = `${uploaderId}/${uuidv4()}.json`;
		const blob = await put(fileName, fileContent, {
			// ★ 変更点 3: 変数 fileContent を使う
			access: 'public',
			contentType: 'application/json'
		});

		// 4. ファイル情報をVercel Postgresに保存
		const fileId = uuidv4();
		await sql`
			INSERT INTO files (
				id, title, description, imageUrl,
				fileName, blobUrl, pathname, contentType, size,
				expiresAt, uploaderId, visibility
			) VALUES (
				${fileId}, ${title}, ${description}, ${imageUrl},
				${sessionData.title || 'untitled'}.json, ${blob.url}, ${blob.pathname}, ${blob.contentType}, ${fileSize}, -- ★ 変更点 4: 計算済みの fileSize を使う
				${expiresAt}, ${uploaderId}, 'public'
			)
		`;

		// 5. 成功レスポンスを返す
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
