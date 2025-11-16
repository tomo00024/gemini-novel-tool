// src/routes/+layout.server.ts

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const session = await event.locals.auth();

	// Vercelのログでセッションが取得できているか確認
	console.log('Session data from +layout.server.ts:', session);

	return {
		session: session
	};
};
