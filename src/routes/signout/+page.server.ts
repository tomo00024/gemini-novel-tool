import { signOut } from '../../auth';
import type { Actions } from './$types';
export const prerender = false;
export const actions: Actions = { default: signOut };
