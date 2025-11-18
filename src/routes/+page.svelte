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
	let isPublishModalOpen = false;
	let isSubmitting = false;
	let isDataLinkModalOpen = false;
	let sessionToPublishId: string | null = null;
	// `contentScope    ` は PublishModal 内で管理されるため、このページでは不要
	let dataLinkModalElement: HTMLDivElement;

	// --- キーボードイベントハンドラ ---
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			isPublishModalOpen = false;
			closeDataLinkModal();
		}
	}

	$: if (isPublishModalOpen || isDataLinkModalOpen) {
		window.addEventListener('keydown', handleKeydown);
		tick().then(() => {
			// PublishModal側でフォーカス管理するため、ここでのフォーカス処理は不要
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
		isPublishModalOpen = true;
	}

	/**
	 * 最終的なアップロードを実行する関数
	 */
	async function handleFinalPublish(event: CustomEvent) {
		// contentScope     は event.detail から受け取る
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

				// Zodからの詳細なエラー情報(errorsオブジェクト)があれば、メッセージに追加する
				if (errorResponse.errors) {
					// errorResponse.errors は { title: ["エラー1"], description: ["エラー2"] } のような形
					const detailedErrors = Object.values(errorResponse.errors)
						.flat() // 配列をフラット化 (例: [['A'], ['B']] -> ['A', 'B'])
						.join('\n'); // 各エラーメッセージを改行で連結

					// 詳細なエラーメッセージが1つでもあれば、errorMessageに追加
					if (detailedErrors) {
						errorMessage += `\n\n詳細:\n${detailedErrors}`;
					}
				}

				// 構築した詳細なエラーメッセージをスローする
				throw new Error(errorMessage);
			}

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
	<!-- ヘッダー部分は変更なし -->
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-xl font-bold text-gray-700">履歴画面</h1>
		<div class="flex items-center gap-4">
			{#if isUploadMode}
				<button
					on:click={() => (isUploadMode = false)}
					class="rounded bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
				>
					戻る
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

	<!-- アップロードモードの案内文も変更なし -->
	{#if isUploadMode}
		<div class="mb-4 rounded-lg bg-blue-100 p-3 text-center text-sm text-blue-800">
			公開したいセッションを選択してください。
		</div>
	{/if}

	<!-- セッションリストの部分も変更なし -->
	{#if $sessions.length === 0}
		<p class="text-gray-500">
			まだセッションがありません。「新しいセッションを開始」ボタンから始めましょう。
		</p>
	{:else}
		<ul class="space-y-3">
			{#each [...$sessions].sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()) as session (session.id)}
				{#if isUploadMode}
					<!-- アップロードモード: on:click で直接 openPublishModal を呼ぶ -->
					<li>
						<button
							type="button"
							class="flex w-full cursor-pointer items-center justify-between rounded-lg bg-white p-4 text-left shadow transition hover:bg-gray-50"
							on:click={() => openPublishModal(session.id)}
						>
							<div class="flex-grow overflow-hidden">
								<div class="truncate text-lg font-semibold text-gray-800">{session.title}</div>
								<div class="mt-1 text-sm text-gray-600">
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
					<!-- 通常モード: 変更なし -->
					<li class="flex items-center justify-between rounded-lg bg-white p-4 shadow">
						<a href="{base}/session/{session.id}" class="flex-grow overflow-hidden">
							<div class="truncate text-lg font-semibold text-gray-800">{session.title}</div>
							<div class="mt-1 text-sm text-gray-600">
								最終更新: {new Date(session.lastUpdatedAt).toLocaleString('ja-JP')}
							</div>
						</a>
						<div class="ml-4 flex flex-shrink-0 items-center gap-2">
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
				{/if}
			{/each}
		</ul>
	{/if}
</div>

<!-- 削除: 公開範囲を選択するための中間モーダルは不要になったので完全に削除します -->
<!-- {#if isModalOpen} ... {/if} -->

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

<!-- データ連携モーダル（アップロード/ダウンロード選択）は変更なし -->
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
