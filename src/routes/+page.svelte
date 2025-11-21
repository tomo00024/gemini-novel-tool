<!-- src/routes/+page.svelte -->
<script lang="ts">
	import { sessions, appSettings } from '$lib/stores';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { createNewSession } from '$lib/utils';
	import { onDestroy } from 'svelte';
	import { tick } from 'svelte';
	import PublishModal from '$lib/components/PublishModal.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	// --- UIの状態管理用変数 ---
	let isUploadMode = false;
	let isPublishModalOpen = false;
	let isSubmitting = false;
	let sessionToPublishId: string | null = null;

	// --- キーボードイベントハンドラ ---
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			// モーダルが開いていれば閉じる
			if (isPublishModalOpen) {
				isPublishModalOpen = false;
			} else if (isUploadMode) {
				// モーダルが閉じていてアップロードモードなら、モードを解除（背景クリックと同じ挙動）
				isUploadMode = false;
			}
		}
	}

	$: if (isPublishModalOpen || isUploadMode) {
		window.addEventListener('keydown', handleKeydown);
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

	function openPublishModal(id: string): void {
		sessionToPublishId = id;
		isPublishModalOpen = true;
	}

	/**
	 * 最終的なアップロードを実行する関数
	 */
	async function handleFinalPublish(event: CustomEvent) {
		const { contentScope } = event.detail;
		if (!sessionToPublishId || !contentScope) return;

		const sessionData = $sessions.find((s) => s.id === sessionToPublishId);
		if (!sessionData) {
			alert('エラー: 対象のセッションが見つかりませんでした。');
			return;
		}

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
					sessionData: sessionData
				})
			});

			if (!response.ok) {
				const errorResponse = await response.json();
				let errorMessage = errorResponse.message || 'アップロードに失敗しました。';

				if (errorResponse.errors) {
					const detailedErrors = Object.values(errorResponse.errors).flat().join('\n');
					if (detailedErrors) {
						errorMessage += `\n\n詳細:\n${detailedErrors}`;
					}
				}
				throw new Error(errorMessage);
			}

			sessions.update((currentSessions) =>
				currentSessions.map((session) => {
					if (session.id === sessionToPublishId) {
						return { ...session, title: event.detail.title };
					}
					return session;
				})
			);

			const result = await response.json();
			alert(`公開が完了しました！`);
			isPublishModalOpen = false;
			isUploadMode = false;
		} catch (error: any) {
			console.error(error);
			alert(`エラー: ${error.message}`);
		} finally {
			isSubmitting = false;
		}
	}

	// 背景クリック時の処理
	function handleBackgroundClick() {
		if (isUploadMode) {
			isUploadMode = false;
		}
	}
</script>

<!-- 
    【修正箇所】
    a11y警告を抑制します。Escapeキーで同等の操作(キャンセル)を提供しているため問題ありません。
-->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="flex h-screen flex-col bg-app-bg text-gray-200" on:click={handleBackgroundClick}>
	<!-- ヘッダー -->
	<div class="flex items-center justify-between p-4">
		<h1 class="text-xl font-bold text-gray-200">履歴画面</h1>
		<div class="flex items-center gap-4">
			{#if isUploadMode}
				<Button
					variant="secondary"
					on:click={(e) => {
						e.stopPropagation();
						isUploadMode = false;
					}}
				>
					戻る
				</Button>
			{:else}
				<a href="{base}/public" on:click|stopPropagation>
					<Button variant="secondary">探す</Button>
				</a>

				<Button
					variant="secondary"
					on:click={(e) => {
						e.stopPropagation();
						isUploadMode = true;
					}}
				>
					投稿
				</Button>
			{/if}

			<a href="{base}/settings" on:click|stopPropagation>
				<Button variant="secondary">アプリ設定</Button>
			</a>

			<Button
				variant="secondary"
				on:click={(e) => {
					e.stopPropagation();
					handleNewSession();
				}}
			>
				新規セッション
			</Button>
		</div>
	</div>

	<div class="mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-4 pb-20">
		<!-- アップロードモードの案内文 -->
		{#if isUploadMode}
			<!-- 
                【修正箇所】
                案内文をクリックしてもモード解除されないように stopPropagation が必要です。
                インタラクティブ要素ではないため警告が出ますが、意図的なので抑制します。
            -->
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<div class="mb-4 text-center font-bold text-gray-200" on:click|stopPropagation>
				公開したいセッションを選択してください。
			</div>
		{/if}

		<!-- セッションリスト -->
		{#if $sessions.length === 0}
			<p class="text-gray-500">
				まだセッションがありません。「新しいセッションを開始」ボタンから始めましょう。
			</p>
		{:else}
			<ul class="space-y-3">
				{#each [...$sessions].sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()) as session (session.id)}
					{#if isUploadMode}
						<!-- アップロードモード -->
						<li>
							<button
								type="button"
								class="flex w-full cursor-pointer items-center justify-between rounded-lg border border-gray-700 bg-transparent p-4 text-left transition hover:bg-gray-800/50"
								on:click|stopPropagation={() => openPublishModal(session.id)}
							>
								<div class="flex-grow overflow-hidden">
									<div class="truncate text-lg font-semibold text-gray-200">{session.title}</div>
									<div class="mt-1 text-sm text-gray-400">
										最終更新: {new Date(session.lastUpdatedAt).toLocaleString('ja-JP')}
									</div>
								</div>
								<div class="ml-4 flex-shrink-0">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="h-5 w-5 text-gray-400"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fill-rule="evenodd"
											d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
											clip-rule="evenodd"
										/>
									</svg>
								</div>
							</button>
						</li>
					{:else}
						<!-- 通常モード -->
						<li
							class="flex items-center justify-between rounded-lg border border-gray-700 bg-transparent p-4 transition hover:bg-gray-800/50"
						>
							<!-- 
                                【修正箇所】
                                通常モードでは背景クリックイベント(handleBackgroundClick)は何もしないため、
                                li で stopPropagation する必要はありません。削除してa11y警告を解消します。
                            -->
							<a href="{base}/session/{session.id}" class="flex-grow overflow-hidden">
								<div class="truncate text-lg font-semibold text-gray-200">{session.title}</div>
								<div class="mt-1 text-sm text-gray-400">
									最終更新: {new Date(session.lastUpdatedAt).toLocaleString('ja-JP')}
								</div>
							</a>
							<div class="ml-4 flex flex-shrink-0 items-center gap-2">
								<Button
									variant="danger"
									class="px-3 py-2 text-sm"
									on:click={(e) => {
										e.stopPropagation();
										handleDeleteSession(session.id);
									}}
									title="このセッションを削除"
								>
									削除
								</Button>
							</div>
						</li>
					{/if}
				{/each}
			</ul>
		{/if}
	</div>
</div>

<!-- 統合されたPublishModalを呼び出す -->
{#if isPublishModalOpen && sessionToPublishId}
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
