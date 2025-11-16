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

	// ★ ここから下の callbacks ブロックを丸ごと追加してください
	callbacks: {
		// JWTが作成・更新されるたびに実行される
		async jwt({ token, user }) {
			// userオブジェクトが存在する場合（＝サインイン時）
			if (user) {
				// tokenにIDを格納する
				token.id = user.id;
			}
			return token;
		},
		// セッションが参照されるたびに実行される
		async session({ session, token }) {
			// tokenからIDを取り出して、セッションのuserオブジェクトに追加する
			if (token.id && session.user) {
				session.user.id = token.id as string;
			}
			return session;
		}
	}
});
