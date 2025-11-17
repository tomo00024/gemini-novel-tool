// src/routes/api/import/[id]/+server.ts
import { error, json } from '@sveltejs/kit';
// ★ 1. createPool と POSTGRES_URL をインポートする
import { createPool } from '@vercel/postgres';
import { POSTGRES_URL } from '$env/static/private';
import type { RequestHandler } from './$types';

// ★ 2. 接続情報を使ってデータベースプールを作成する
const pool = createPool({
	connectionString: POSTGRES_URL
});

export const GET: RequestHandler = async ({ params }) => {
	const fileId = params.id;

	try {
		// ★ 3. sql を pool.sql に変更する
		const { rows } = await pool.sql`
            SELECT
                bloburl AS "blobUrl"
            FROM
                files
            WHERE
                id = ${fileId};
        `;

		const file = rows[0];
		if (!file) {
			throw error(404, 'Not Found: 指定されたファイルが見つかりません。');
		}

		// ★ 3. sql を pool.sql に変更する
		await pool.sql`
            UPDATE files
            SET downloadcount = downloadcount + 1
            WHERE id = ${fileId};
        `;

		const blobResponse = await fetch(file.blobUrl);
		if (!blobResponse.ok) {
			throw error(500, 'Failed to fetch file from storage.');
		}

		const sessionData = await blobResponse.json();

		return json(sessionData, { status: 200 });
	} catch (e: any) {
		console.error('Import API Error:', e);
		if (e.status) {
			throw e;
		}
		throw error(500, 'Internal Server Error: ファイルの処理中にエラーが発生しました。');
	}
};
