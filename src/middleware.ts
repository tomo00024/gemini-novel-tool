import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 定数: 許容する最大リクエストボディサイズ (1MB)
// +server.tsの定数と合わせておくと管理がしやすいです
const MAX_PAYLOAD_SIZE_BYTES = 1 * 1024 * 1024;

// このミドルウェアを適用したいパスを指定します。
// あなたのアップロード用+server.tsが置かれている実際のパスに合わせて変更してください。
// 例: アップロードAPIが `src/routes/api/upload/+server.ts` にある場合、パスは `/api/upload` となります。
export const config = {
	matcher: '/api/upload' // <-- ★★★ あなたの環境に合わせて必ず変更してください ★★★
};

export function middleware(request: NextRequest) {
	// このミドルウェアはmatcherで指定されたパスのPOSTリクエストに対してのみ動作します。
	// (configでmethodを指定できないため、念の為チェック)
	if (request.method !== 'POST') {
		return NextResponse.next();
	}

	// リクエストヘッダーから Content-Length を取得
	const contentLengthHeader = request.headers.get('content-length');

	// Content-Length がヘッダーにない場合、または数値でない場合はリクエストを続行させ、
	// バックエンドのバリデーションに判断を委ねる。
	// (厳格にブロックしたい場合は、ここでエラーレスポンスを返しても良い)
	if (!contentLengthHeader || isNaN(parseInt(contentLengthHeader))) {
		return NextResponse.next();
	}

	const bodySize = parseInt(contentLengthHeader);

	// サイズが上限を超えているかチェック
	if (bodySize > MAX_PAYLOAD_SIZE_BYTES) {
		console.log(
			`[EDGE] Blocked request to ${request.nextUrl.pathname}: Payload size (${bodySize} bytes) exceeds limit of ${MAX_PAYLOAD_SIZE_BYTES} bytes.`
		);

		// 413 Payload Too Large レスポンスを生成して即座に返す
		return new NextResponse(
			JSON.stringify({
				message: `Payload Too Large. The maximum allowed size is ${MAX_PAYLOAD_SIZE_BYTES / 1024 / 1024}MB.`
			}),
			{
				status: 413,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	}

	// サイズ制限をクリアした場合、リクエストをSvelteKitサーバー（オリジン）に渡す
	return NextResponse.next();
}
