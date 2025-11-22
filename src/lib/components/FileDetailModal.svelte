<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { onMount, onDestroy } from 'svelte';
	import { sessions } from '$lib/stores';
	import type { Session } from '$lib/types';
	import { generateUUID } from '$lib/utils';
	import type { Session as AuthSession } from '@auth/sveltekit';
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

	export let session: AuthSession | null = null;
	export let file: any;

	const dispatch = createEventDispatcher();

	let isEditing = false; // 編集モードの状態
	let isSaving = false; // 保存処理中の状態
	let editableFile = { ...file }; // 編集用のファイルオブジェクトのコピー

	function handleEditClick() {
		// 編集ボタンが押されたら、現在のファイル情報で編集用オブジェクトを初期化
		editableFile = { ...file };
		isEditing = true;
	}

	function handleCancelEdit() {
		// キャンセルされたら編集モードを終了
		isEditing = false;
	}

	async function handleUpdate() {
		if (isSaving) return;
		isSaving = true;

		try {
			const response = await fetch(`/api/files/${file.id}`, {
				method: 'PATCH', // 部分更新なのでPATCHメソッドを使用
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					title: editableFile.title,
					authorName: editableFile.authorName,
					description: editableFile.description,
					imageUrl: editableFile.imageUrl,
					model: editableFile.model
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || '更新に失敗しました。');
			}

			const updatedFile = await response.json();

			alert('セッション情報を更新しました。');
			// 親コンポーネントに変更を通知
			dispatch('updated', updatedFile);
			isEditing = false; // 編集モードを終了
			closeModal(); // モーダルを閉じる
		} catch (err: any) {
			console.error('Update failed:', err);
			alert(`エラーが発生しました: ${err.message}`);
		} finally {
			isSaving = false;
		}
	}

	let isImporting = false;
	let isDeleting = false;
	$: isOwner = session?.user?.id === file.uploaderId;
	function closeModal() {
		dispatch('close');
	}

	async function handleImport() {
		if (isImporting) return;
		isImporting = true;

		try {
			const response = await fetch(`/api/import/${file.id}`);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'セッションの読み込みに失敗しました。');
			}

			const originalSession = (await response.json()) as Session;

			// 新しいセッションオブジェクトを作成し、複製する
			const newSession: Session = {
				...originalSession, // 元のセッションデータをすべてコピー
				id: generateUUID(), // 新しいユニークなIDを割り当てる
				lastUpdatedAt: new Date().toISOString(), // 最終更新日時を現在に設定
				// インポート元情報（目印）を追加する
				importedInfo: {
					originalId: file.id, // 公開されていた時のID
					authorName: file.authorName, // 公開した作者名
					importedAt: new Date().toISOString()
				}
			};

			// sessionsストアを更新して、複製した新しいセッションをリストの先頭に追加
			sessions.update((currentSessions) => {
				return [newSession, ...currentSessions];
			});

			alert(`「${newSession.title}」を履歴に読み込みました。`);
			closeModal();
		} catch (err: any) {
			console.error('Import failed:', err);
			alert(`エラーが発生しました: ${err.message}`);
		} finally {
			isImporting = false;
		}
	}

	// 削除処理の関数
	async function handleDelete() {
		if (isDeleting) return;

		// 最終確認
		if (!confirm('本当にこのセッションを削除しますか？\nこの操作は取り消せません。')) {
			return;
		}

		isDeleting = true;

		try {
			const response = await fetch(`/api/files/${file.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || '削除に失敗しました。');
			}

			alert('セッションを削除しました。');
			// 親コンポーネントに削除が完了したことを通知
			dispatch('deleted', file.id);
			closeModal();
		} catch (err: any) {
			console.error('Deletion failed:', err);
			alert(`エラーが発生しました: ${err.message}`);
		} finally {
			isDeleting = false;
		}
	}

	function extractImageUrl(urlString: string): string {
		if (typeof urlString !== 'string') {
			return '';
		}
		const match = urlString.match(/!\[.*?\]\((.*?)\)/);
		return match ? match[1] : urlString;
	}
</script>

<Modal
	isOpen={true}
	title={isEditing ? '情報を編集' : file.title}
	size="lg"
	noPadding={true}
	on:close={closeModal}
>
	<!-- 画像ヘッダー -->
	{#if !isEditing}
		{#if file.imageUrl}
			<img
				src={extractImageUrl(file.imageUrl)}
				alt="{file.title}のサムネイル"
				class="h-64 w-full object-cover opacity-90"
			/>
		{/if}
	{/if}

	<!-- コンテンツエリア -->
	<div class="flex flex-col p-6">
		{#if isEditing}
			<div class="space-y-4">
				<div>
					<label for="title" class="block text-sm font-medium text-text-sub">タイトル *</label>
					<input
						type="text"
						id="title"
						bind:value={editableFile.title}
						class="mt-1 block w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-text-main shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none sm:text-sm"
						required
					/>
				</div>
				<div>
					<label for="model" class="block text-sm font-medium text-text-sub">モデル</label>
					<input
						type="text"
						id="model"
						bind:value={editableFile.model}
						placeholder="gemini-1.5-pro など"
						class="mt-1 block w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-text-main shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none sm:text-sm"
					/>
				</div>
				<div>
					<label for="authorName" class="block text-sm font-medium text-text-sub">作者名</label>
					<input
						type="text"
						id="authorName"
						bind:value={editableFile.authorName}
						class="mt-1 block w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-text-main shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none sm:text-sm"
					/>
				</div>
				<div>
					<label for="description" class="block text-sm font-medium text-text-sub">説明文</label>
					<textarea
						id="description"
						bind:value={editableFile.description}
						rows="4"
						class="mt-1 block w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-text-main shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none sm:text-sm"
					></textarea>
				</div>
				<div>
					<label for="imageUrl" class="block text-sm font-medium text-text-sub">画像URL</label>
					<input
						type="url"
						id="imageUrl"
						bind:value={editableFile.imageUrl}
						class="mt-1 block w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-text-main shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none sm:text-sm"
					/>
				</div>
			</div>
		{:else}
			<!-- メタ情報 -->
			<div class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-sub">
				{#if file.model}
					<span class="flex items-center gap-1" title="使用モデル">
						🤖 {file.model.replace(/^models\//, '')}
					</span>
				{/if}
				<span>👤 {file.authorName}</span>
				<span>★ {file.starCount}</span>
				<span>↓ {file.downloadCount}</span>
				<span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
			</div>

			<!-- タグ -->
			{#if file.tags && file.tags.length > 0}
				<div class="mb-4 flex flex-wrap gap-2">
					{#each file.tags as tag}
						<span class="rounded-full bg-main-bg px-3 py-1 text-xs font-medium text-text-main">
							{tag}
						</span>
					{/each}
				</div>
			{/if}

			<!-- 説明 -->
			<p id="modal-description" class="text-base leading-relaxed text-text-main">
				{file.description}
			</p>
		{/if}
	</div>

	<!-- フッター -->
	<div slot="footer" class="flex w-full items-center justify-between">
		{#if isEditing}
			<!-- --- 編集モードのフッター --- -->
			<div class="ml-auto flex gap-3">
				<Button variant="primary" on:click={handleCancelEdit}>キャンセル</Button>
				<Button
					variant="primary"
					on:click={handleUpdate}
					disabled={!editableFile.title || isSaving}
				>
					{isSaving ? '保存中...' : '保存する'}
				</Button>
			</div>
		{:else}
			<!-- --- 表示モードのフッター --- -->
			<!-- 左側にオーナー用ボタンを配置 -->
			<div class="flex gap-2">
				{#if isOwner}
					<Button variant="danger" on:click={handleDelete} disabled={isDeleting}>
						{isDeleting ? '削除中...' : '削除'}
					</Button>
					<!-- 編集ボタン -->
					<Button variant="primary" on:click={handleEditClick}>編集</Button>
				{/if}
			</div>

			<!-- 右側に通常のボタンを配置 -->
			<div class="flex justify-end gap-3">
				<Button variant="primary" on:click={closeModal}>閉じる</Button>
				<Button variant="primary" on:click={handleImport} disabled={isImporting}>
					{isImporting ? '読み込み中...' : '読み込む'}
				</Button>
			</div>
		{/if}
	</div>
</Modal>
