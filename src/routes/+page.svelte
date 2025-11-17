<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { sessions, appSettings } from '$lib/stores';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { createNewSession } from '$lib/utils';
	import { onDestroy } from 'svelte';
	import { tick } from 'svelte';
	import PublishModal from '$lib/components/PublishModal.svelte';

	// --- UIの状態管理用変数 ---
	let isUploadMode = false;
	let isModalOpen = false;
	let isPublishModalOpen = false;
	let isSubmitting = false;
	let isDataLinkModalOpen = false;
	let sessionToPublishId: string | null = null;
	let publishScope: 'template' | 'full' | null = null;
	let modalElement: HTMLDivElement;
	let dataLinkModalElement: HTMLDivElement;

	// --- キーボードイベントハンドラ ---
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeModal();
			closeDataLinkModal();
		}
	}

	$: if (isModalOpen || isDataLinkModalOpen) {
		window.addEventListener('keydown', handleKeydown);
		tick().then(() => {
			if (isModalOpen) modalElement?.focus();
			if (isDataLinkModalOpen) dataLinkModalElement?.focus();
		});
	} else {
		window.removeEventListener('keydown', handleKeydown);
	}

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
	});

	function handleNewSession(): void {
		const newSession = createNewSession();
		sessions.update((currentSessions) => [...currentSessions, newSession]);
		goto(`${base}/session/${newSession.id}`);
	}

	function handleDeleteSession(id: string): void {
		if (!confirm('このセッションを削除しますか？この操作は取り消せません。')) {
			return;
		}
		sessions.update((currentSessions) => currentSessions.filter((session) => session.id !== id));
	}

	function toggleUploadMode(): void {
		isUploadMode = !isUploadMode;
	}

	function openPublishModal(id: string): void {
		sessionToPublishId = id;
		publishScope = null;
		isModalOpen = true;
	}

	function closeModal(): void {
		isModalOpen = false;
	}

	function handleSelectPublishScope(): void {
		if (!sessionToPublishId || !publishScope) return;
		closeModal();
		isPublishModalOpen = true;
	}

	/**
	 * 最終的なアップロードを実行する関数
	 */
	async function handleFinalPublish(event: CustomEvent) {
		if (!sessionToPublishId || !publishScope) return;

		const sessionData = $sessions.find((s) => s.id === sessionToPublishId);
		if (!sessionData) {
			alert('エラー: 対象のセッションが見つかりませんでした。');
			return;
		}

		// ▼▼▼ ストアを更新し、次回のために作者名を記憶させる ▼▼▼
		appSettings.update((settings) => ({
			...settings,
			lastUsedAuthorName: event.detail.authorName || ''
		}));
		isSubmitting = true;

		try {
			const response = await fetch(`${base}/api/upload`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...event.detail,
					sessionId: sessionToPublishId,
					publishScope: publishScope,
					sessionData: sessionData
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || 'アップロードに失敗しました。');
			}

			// ★ 変更点 1: アップロード成功後、ローカルのセッションタイトルも更新する
			sessions.update((currentSessions) =>
				currentSessions.map((session) => {
					if (session.id === sessionToPublishId) {
						// 新しいタイトルでセッションオブジェクトを更新
						return { ...session, title: event.detail.title };
					}
					return session;
				})
			);

			const result = await response.json();
			alert(`公開が完了しました！\n公開URL: ${result.url}`);
			isPublishModalOpen = false;
			isUploadMode = false;
		} catch (error: any) {
			console.error(error);
			alert(`エラー: ${error.message}`);
		} finally {
			isSubmitting = false;
		}
	}

	function openDataLinkModal(): void {
		isDataLinkModalOpen = true;
	}

	function closeDataLinkModal(): void {
		isDataLinkModalOpen = false;
	}

	function handleUploadSelect(): void {
		closeDataLinkModal();
		isUploadMode = true;
	}
</script>

<div class="flex h-screen flex-col p-4">
	<!-- ... (変更なし) ... -->
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-xl font-bold text-gray-700">履歴画面</h1>
		<div class="flex items-center gap-4">
			{#if isUploadMode}
				<button
					on:click={() => (isUploadMode = false)}
					class="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
				>
					完了
				</button>
			{:else}
				<button
					on:click={openDataLinkModal}
					class="rounded bg-gray-500 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-600"
				>
					公開サーバー
				</button>
			{/if}
			<a
				href="{base}/settings"
				class="rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
				>アプリ設定</a
			>
			<button
				on:click={handleNewSession}
				class="rounded bg-[#133a0e] px-3 py-2 text-sm font-semibold text-white hover:bg-[#0d2c0b]"
				>新規セッション</button
			>
		</div>
	</div>

	{#if isUploadMode}
		<div class="mb-4 rounded-lg bg-blue-100 p-3 text-center text-sm text-blue-800">
			公開したいセッションを選択してください。
		</div>
	{/if}

	{#if $sessions.length === 0}
		<p class="text-gray-500">
			まだセッションがありません。「新しいセッションを開始」ボタンから始めましょう。
		</p>
	{:else}
		<ul class="space-y-3">
			{#each [...$sessions].sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()) as session (session.id)}
				<li class="flex items-center justify-between rounded-lg bg-white p-4 shadow">
					<a href="{base}/session/{session.id}" class="flex-grow overflow-hidden">
						<div class="truncate text-lg font-semibold text-gray-800">{session.title}</div>
						<div class="mt-1 text-sm text-gray-600">
							最終更新: {new Date(session.lastUpdatedAt).toLocaleString('ja-JP')}
						</div>
					</a>
					<div class="ml-4 flex flex-shrink-0 items-center gap-2">
						{#if isUploadMode}
							<button
								on:click|stopPropagation={(e) => {
									e.preventDefault();
									openPublishModal(session.id);
								}}
								class="rounded bg-green-200 px-3 py-2 text-sm font-semibold text-green-800 hover:bg-green-300"
								title="このセッションを公開"
							>
								公開
							</button>
						{/if}
						<button
							on:click|stopPropagation={(e) => {
								e.preventDefault();
								handleDeleteSession(session.id);
							}}
							class="rounded bg-red-200 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-300"
							title="このセッションを削除"
						>
							削除
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<!-- ... (公開範囲選択モーダルの部分は変更なし) ... -->
{#if isModalOpen}
	<!-- svelte-ignore a11y-no-static-element-interactions, a11y-click-events-have-key-events -->
	<div
		class="bg-opacity-60 fixed inset-0 z-50 flex items-center justify-center bg-black"
		on:click={closeModal}
	>
		<div
			bind:this={modalElement}
			tabindex="-1"
			class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl outline-none"
			on:click|stopPropagation
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
		>
			<h2 id="modal-title" class="text-xl font-bold text-gray-800">セッションの公開</h2>
			<p class="mt-2 text-sm text-gray-600">どの範囲の情報を公開しますか？</p>

			<div class="mt-4 space-y-4">
				<label
					class="flex cursor-pointer items-start rounded-lg border p-4 transition hover:bg-gray-50"
				>
					<input
						type="radio"
						name="publish-scope"
						value="template"
						class="mt-1 mr-4 h-5 w-5"
						bind:group={publishScope}
					/>
					<div>
						<span class="font-semibold text-gray-800">テンプレートのみ公開</span>
						<p class="mt-1 text-sm text-gray-600">
							AIの設定と最初のプロンプトだけを公開します。チャットの会話履歴は含まれません。他の人がこの設定をコピーして使いたい場合に最適です。
						</p>
					</div>
				</label>
				<label
					class="flex cursor-pointer items-start rounded-lg border p-4 transition hover:bg-gray-50"
				>
					<input
						type="radio"
						name="publish-scope"
						value="full"
						class="mt-1 mr-4 h-5 w-5"
						bind:group={publishScope}
					/>
					<div>
						<span class="font-semibold text-gray-800">すべての会話履歴を公開</span>
						<p class="mt-1 text-sm text-gray-600">
							設定、プロンプト、そしてすべてのAIとの会話履歴を公開します。
						</p>
						<div
							class="mt-2 rounded border-l-4 border-yellow-400 bg-yellow-50 p-2 text-sm text-yellow-800"
						>
							<strong class="font-bold">⚠️【注意】</strong>
							内容をよく確認してください。個人情報や機密情報が含まれていないかご注意ください。
						</div>
					</div>
				</label>
			</div>

			<div class="mt-6 flex justify-end gap-3">
				<button
					on:click={closeModal}
					class="rounded bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
				>
					キャンセル
				</button>
				<button
					on:click={handleSelectPublishScope}
					disabled={!publishScope}
					class="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
				>
					選択して公開
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ★ 変更点 2: PublishModalに `initialTitle` を渡す -->
{#if isPublishModalOpen && sessionToPublishId && publishScope}
	{@const sessionToPublish = $sessions.find((s) => s.id === sessionToPublishId)}
	{#if sessionToPublish}
		<PublishModal
			busy={isSubmitting}
			initialTitle={sessionToPublish.title}
			on:submit={handleFinalPublish}
			on:close={() => (isPublishModalOpen = false)}
		/>
	{/if}
{/if}

<!-- ... (データ連携モーダルの部分は変更なし) ... -->
{#if isDataLinkModalOpen}
	<!-- svelte-ignore a11y-no-static-element-interactions, a11y-click-events-have-key-events -->
	<div
		class="bg-opacity-60 fixed inset-0 z-50 flex items-center justify-center bg-black"
		on:click={closeDataLinkModal}
	>
		<div
			bind:this={dataLinkModalElement}
			tabindex="-1"
			class="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl outline-none"
			on:click|stopPropagation
			role="dialog"
			aria-modal="true"
			aria-labelledby="data-link-modal-title"
		>
			<h2 id="data-link-modal-title" class="text-xl font-bold text-gray-800">公開サーバー</h2>
			<p class="mt-2 text-sm text-gray-600">どの操作を実行しますか？</p>

			<div class="mt-4 space-y-4">
				<button
					on:click={handleUploadSelect}
					class="flex w-full cursor-pointer items-start rounded-lg border p-4 text-left transition hover:bg-gray-50"
				>
					<div class="mr-4 text-2xl">↑</div>
					<div>
						<span class="font-semibold text-gray-800">アップロード</span>
						<p class="mt-1 text-sm text-gray-600">
							公開したいセッションを選択して、サーバーに保存します。※アップロードにはGoogle認証が必要です。
						</p>
					</div>
				</button>

				<a
					href="{base}/public"
					class="flex w-full cursor-pointer items-start rounded-lg border p-4 text-left transition hover:bg-gray-50"
				>
					<div class="mr-4 text-2xl">↓</div>
					<div>
						<span class="font-semibold text-gray-800">ダウンロード</span>
						<p class="mt-1 text-sm text-gray-600">
							サーバーに保存されているセッションを選び、アプリに読み込みます。
						</p>
					</div>
				</a>
			</div>

			<div class="mt-6 flex justify-end gap-3">
				<button
					on:click={closeDataLinkModal}
					class="rounded bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
				>
					キャンセル
				</button>
			</div>
		</div>
	</div>
{/if}
