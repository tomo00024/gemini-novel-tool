// src/lib/schemas/upload.ts
import { z } from 'zod';

// Zodの古いバージョンでも動作する検証スキーマ
export const uploadSchema = z.object({
	// title: 必須、1文字以上、150文字以下
	title: z
		.string()
		.min(1, { message: 'タイトルは必須です。' }) // .min(1) で必須項目を表現します
		.max(100, { message: 'タイトルは100文字以内で入力してください。' }),

	// description: 任意、5000文字以下
	description: z
		.string()
		.max(5000, { message: '説明は5000文字以内で入力してください。' })
		.optional()
		.nullable(),

	// imageUrl: 任意、有効なURL形式
	imageUrl: z.string().url({ message: '有効なURL形式で入力してください。' }).optional().nullable(),

	// authorName: 必須、1文字以上、100文字以下
	authorName: z.string().max(50, { message: '作者名は100文字以内で入力してください。' }),

	// expiresAt: 任意、有効な日付・時刻形式の文字列
	expiresAt: z
		.string()
		.datetime({ message: '有効な日付形式で入力してください。' })
		.optional()
		.nullable(),

	// sessionData: 必須、内容は問わないが存在することを確認
	sessionData: z.any().refine((val) => val !== null && val !== undefined, {
		message: 'セッションデータは必須です。'
	})
});

export type UploadSchema = z.infer<typeof uploadSchema>;
