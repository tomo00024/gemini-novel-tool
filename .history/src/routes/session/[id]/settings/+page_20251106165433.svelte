<!-- src/routes/session/[id]/settings/+page.svelte -->

<script lang="ts">
	import { page } from '$app/stores';
	import { sessions } from '$lib/stores';
	import { derived } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import type { Session } from '$lib/types';
	// --- ストアと変数の設定 ---
	const sessionId = derived(page, ($page) => $page.params.id);

	const currentSession = derived(
		[sessions, sessionId],
		([$sessions, $sessionId]) => $sessions.find((s) => s.id === $sessionId)
	);

	onMount(() => {
		if (!$sessions.some((s) => s.id === $page.params.id)) {
			goto(base || '/');
		}

		// ★★★ [追加] 古いセッションデータにデフォルト値を設定 ★★★
		// viewModeが未定義の場合、デフォルト値として'standard'を設定する
		if ($currentSession && typeof $currentSession.viewMode === 'undefined') {
			sessions.update((allSessions) => {
				const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
				if (sessionToUpdate) {
					sessionToUpdate.viewMode = 'standard';
				}
				return allSessions;
			});
		}
	});

	// --- ストア更新用の関数 ---
	function updateSession() {
		// bind:groupやbind:checkedで値はすでに更新されているので、
		// ここではlastUpdatedAtを更新して変更をストアに永続化させるのが目的
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate) {
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	// (以降の関数は変更なし)
	function toggleGoodwillEnabled() {
		updateSession();
	}

	function addThreshold() {
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.featureSettings.goodwill) {
				sessionToUpdate.featureSettings.goodwill.thresholds.push({
					level: 0,
					prompt_addon: ''
				});
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	function removeThreshold(index: number) {
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.featureSettings.goodwill) {
				sessionToUpdate.featureSettings.goodwill.thresholds.splice(index, 1);
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}
</script>

<div class="flex flex-col h-screen p-4">
	<div class="flex justify-between items-center mb-6">
		<h1 class="text-2xl font-bold">セッション設定</h1>
		<a
			href="{base}/session/{$sessionId}"
			class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-3 rounded"
		>
			セッションに戻る
		</a>
	</div>

	{#if $currentSession}
		<div class="space-y-6">
			<!-- ▼▼▼ [ここからが追加UI] 表示モード設定 ▼▼▼ -->
			<div class="p-4 border rounded-lg">
				<h2 class="text-lg font-semibold mb-3">表示設定</h2>
				<p class="text-sm text-gray-600 mb-4">チャット画面の見た目を切り替えます。</p>
				
				<!-- svelteの bind:group を使ってviewModeの値をラジオボタンと連動させる -->
				<div class="flex gap-4" on:change={updateSession}>
					<label class="flex items-center gap-2 p-3 border rounded-md cursor-pointer has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
						<input type="radio" name="view-mode" value="standard" bind:group={$currentSession.viewMode} />
						<span>標準モード</span>
					</label>
					<label class="flex items-center gap-2 p-3 border rounded-md cursor-pointer has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
						<input type="radio" name="view-mode" value="game" bind:group={$currentSession.viewMode} />
						<span>ゲーム風モード</span>
					</label>
				</div>
			</div>
			<!-- ▲▲▲ ここまで ▲▲▲ -->


			{#if $currentSession.featureSettings.goodwill}
				{@const goodwill = $currentSession.featureSettings.goodwill}
				<div class="p-4 border rounded-lg">
					<h2 class="text-lg font-semibold mb-3">好感度機能</h2>

					<!-- 機能の有効/無効トグル -->
					<label class="flex items-center justify-between cursor-pointer">
						<span>この機能を有効にする</span>
						<input
							type="checkbox"
							class="toggle"
							bind:checked={goodwill.isEnabled}
							on:change={toggleGoodwillEnabled}
						/>
					</label>

					{#if goodwill.isEnabled}
						<div class="mt-4 space-y-4">
							<!-- AIへの指示 (Description) -->
							<div>
								<label for="goodwill-desc" class="block mb-2 font-medium">
									AIへの指示 (description)
								</label>
								<textarea
									id="goodwill-desc"
									class="w-full p-2 border rounded textarea"
									placeholder="例: キャラクターの好感度の増減を2から-2までの5段階評価"
									bind:value={goodwill.descriptionForAI}
									on:input={updateSession}
								></textarea>
							</div>

							<!-- しきい値設定UI -->
							<div>
								<h3 class="font-medium mb-2">好感度によるAIの応答変化ルール</h3>
								<div class="space-y-3">
									{#each goodwill.thresholds as threshold, i (i)}
										<div class="flex items-start gap-2 p-2 border rounded-md bg-gray-50">
											<!-- Level -->
											<div class="flex-none">
												<label for="level-{i}" class="text-sm font-bold">Level</label>
												<input
													id="level-{i}"
													type="number"
													class="input input-bordered w-24"
													bind:value={threshold.level}
													on:input={updateSession}
												/>
											</div>
											<!-- Prompt Addon -->
											<div class="flex-grow">
												<label for="prompt-{i}" class="text-sm font-bold">追加プロンプト</label>
												<textarea
													id="prompt-{i}"
													class="textarea textarea-bordered w-full h-20"
													placeholder="このレベルの時にAIに追加される指示"
													bind:value={threshold.prompt_addon}
													on:input={updateSession}
												></textarea>
											</div>
											<!-- Remove button -->
											<button
												class="btn btn-sm btn-circle btn-ghost mt-6"
												on:click={() => removeThreshold(i)}
												aria-label="Remove threshold {i}"
											>
												✕
											</button>
										</div>
									{/each}

									<button class="btn btn-sm btn-outline btn-primary mt-2" on:click={addThreshold}>
										+ ルールを追加
									</button>
								</div>
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{:else}
		<p>セッション情報を読み込んでいます...</p>
	{/if}
</div>

<style>
	/* (styleタグの中身は変更なし) */
	.toggle {
		position: relative;
		display: inline-block;
		width: 50px;
		height: 28px;
		background-color: #ccc;
		border-radius: 9999px;
		transition: background-color 0.2s;
		appearance: none;
		cursor: pointer;
	}
	.toggle::before {
		content: '';
		position: absolute;
		top: 4px;
		left: 4px;
		width: 20px;
		height: 20px;
		background-color: white;
		border-radius: 50%;
		transition: transform 0.2s;
	}
	.toggle:checked {
		background-color: #4ade80;
	}
	.toggle:checked::before {
		transform: translateX(22px);
	}
	.btn {
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		cursor: pointer;
	}
	.btn-primary {
		background-color: #3b82f6;
		color: white;
	}
</style>