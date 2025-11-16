// src/auth.ts
import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import { AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_SECRET } from '$env/static/private';

export const { handle, signIn, signOut } = SvelteKitAuth({
	providers: [
		Google({
			clientId: AUTH_GOOGLE_ID,
			clientSecret: AUTH_GOOGLE_SECRET
		})
	],
	secret: AUTH_SECRET,
	trustHost: true,

	// ▼▼▼ このcookiesブロックを追加 ▼▼▼
	cookies: {
		sessionToken: {
			name: `__Secure-authjs.session-token`,
			options: {
				httpOnly: true,
				sameSite: 'lax',
				path: '/',
				secure: true,
				// Vercelのプレビュードメインと本番ドメインで共有するためにDomain属性を調整
				// process.env.VERCEL_URLにはVercelが自動で現在のURLを入れてくれる
				domain: process.env.VERCEL_URL
					? `.${process.env.VERCEL_URL.split('.').slice(-2).join('.')}`
					: undefined
			}
		}
	}
});
