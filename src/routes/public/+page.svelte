<!-- src/routes/public/+page.svelte -->
<script lang="ts">
	import { base } from '$app/paths';
	import FileDetailModal from '$lib/components/FileDetailModal.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';

	import type { PageData } from './$types';

	export let data: PageData;

	// モーダル表示のための状態変数
	let selectedFile: any = null;
	let isModalOpen = false;
	let searchQuery = '';

	// カードがクリックされたときにモーダルを開く関数
	function openModal(file: any) {
		selectedFile = file;
		isModalOpen = true;
	}

	// モーダルを閉じる関数
	function closeModal() {
		isModalOpen = false;
		selectedFile = null;
	}

	// モーダルから削除イベントを受け取ったとき
	function handleFileDeleted(event: CustomEvent<string>) {
		const deletedFileId = event.detail;
		// 削除されたファイルをリストから除外してUIを更新
		data.files = data.files.filter((file) => file.id !== deletedFileId);
	}

	// --- 更新イベントを受け取るハンドラの追加 ---
	function handleFileUpdated(event: CustomEvent<any>) {
		const updatedFile = event.detail;
		// data.files配列から更新されたファイルを見つけて置き換える
		data.files = data.files.map((file) => {
			if (file.id === updatedFile.id) {
				return updatedFile; // 新しいデータに置き換え
			}
			return file;
		});
	}

	/**
	 * Markdown形式の画像リンクからURLを抽出する関数。
	 * @param urlString - URLを含む可能性のある文字列
	 */
	function extractImageUrl(urlString: string): string {
		if (typeof urlString !== 'string') {
			return '';
		}
		const match = urlString.match(/!\[.*?\]\((.*?)\)/);
		return match ? match[1] : urlString;
	}
</script>

<div class="flex h-screen flex-col bg-app-bg p-4 text-gray-200">
	<div class="mx-auto w-full max-w-3xl flex-1 overflow-y-auto pb-20">
		<!-- ヘッダー -->
		<div class="mb-6 flex items-center justify-between">
			<h1 class="text-xl font-bold text-gray-200">公開セッション</h1>
			<a href="{base}/">
				<Button variant="secondary">履歴画面</Button>
			</a>
		</div>
		<p class="mb-6 text-gray-400">他のユーザーが公開したセッションを読み込みます</p>

		<div class="mb-6">
			<Input
				type="search"
				bind:value={searchQuery}
				placeholder="キーワードで検索..."
				class="w-full"
			/>
		</div>

		<div class="space-y-4">
			{#if data.files.length === 0}
				<div class="py-16 text-center text-gray-500">
					まだ公開されているセッションがありません。
				</div>
			{:else}
				{#each data.files as file (file.id)}
					<!-- カード全体をクリック可能にし、モーダルを開くようにする -->
					<!-- svelte-ignore a11y-no-static-element-interactions -->
					<!-- svelte-ignore a11y-click-events-have-key-events -->
					<div
						class="cursor-pointer rounded-lg border border-gray-700 bg-transparent p-4 transition hover:bg-gray-800/50"
						on:click={() => openModal(file)}
					>
						<div class="flex flex-row gap-4">
							{#if file.imageUrl}
								<div class="flex-shrink-0">
									<img
										src={extractImageUrl(file.imageUrl)}
										alt="{file.title}のサムネイル"
										class="h-24 w-24 rounded-md object-cover sm:h-28 sm:w-28"
									/>
								</div>
							{/if}

							<div class="flex flex-grow flex-col overflow-hidden">
								<h3 class="truncate text-lg font-semibold text-gray-200">{file.title}</h3>

								{#if file.tags && file.tags.length > 0}
									<div class="mt-2 flex flex-wrap gap-2">
										{#each file.tags as tag}
											<span
												class="rounded-full bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-300"
											>
												{tag}
											</span>
										{/each}
									</div>
								{/if}

								<p class="mt-2 line-clamp-2 flex-grow text-sm text-gray-400">{file.description}</p>

								<!-- メタ情報 -->
								<div class="mt-3 flex items-center justify-between">
									<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
										<span>👤 {file.authorName}</span>
										{#if file.model}
											<span class="flex items-center gap-1" title="使用モデル">
												🤖 {file.model.replace(/^models\//, '')}
											</span>
										{/if}
										<span>★ {file.starCount}</span>
										<span>↓ {file.downloadCount}</span>
										<span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>

{#if isModalOpen && selectedFile}
	<FileDetailModal
		file={selectedFile}
		session={data.session}
		on:close={closeModal}
		on:deleted={handleFileDeleted}
		on:updated={handleFileUpdated}
	/>
{/if}
