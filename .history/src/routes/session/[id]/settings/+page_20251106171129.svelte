<!-- src/routes/session/[id]/settings/+page.svelte -->

<script lang="ts">
	import { page } from '$app/stores';
	import { sessions } from '$lib/stores';
	import { derived } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';

	const sessionId = derived(page, ($page) => $page.params.id);

	// このderivedストアは値の「読み取り」にのみ使用します
	const currentSession = derived(
		[sessions, sessionId],
		([$sessions, $sessionId]) => $sessions.find((s) => s.id === $sessionId)
	);

	onMount(() => {
		if (!$sessions.some((s) => s.id === $page.params.id)) {
			goto(base || '/');
		}
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

	// ▼▼▼ [ここからが修正箇所] bind: をやめ、手動でストアを更新する関数群 ▼▼▼

	function handleViewModeChange(event: Event) {
		const newMode = (event.target as HTMLInputElement).value as 'standard' | 'game';
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate) {
				sessionToUpdate.viewMode = newMode;
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	function handleGoodwillEnabledChange(event: Event) {
		const isEnabled = (event.target as HTMLInputElement).checked;
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.featureSettings.goodwill) {
				sessionToUpdate.featureSettings.goodwill.isEnabled = isEnabled;
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	function handleDescriptionChange(event: Event) {
		const newDescription = (event.target as HTMLTextAreaElement).value;
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.featureSettings.goodwill) {
				sessionToUpdate.featureSettings.goodwill.descriptionForAI = newDescription;
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	function handleThresholdChange(index: number, field: 'level' | 'prompt_addon', event: Event) {
		const newValue = (event.target as HTMLInputElement).value;
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.featureSettings.goodwill) {
				const threshold = sessionToUpdate.featureSettings.goodwill.thresholds[index];
				if (field === 'level') {
					threshold.level = Number(newValue);
				} else {
					threshold.prompt_addon = newValue;
				}
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}
	
	function addThreshold() {
		sessions.update(allSessions => {
			const sessionToUpdate = allSessions.find(s => s.id === $page.params.id);
			if (sessionToUpdate?.featureSettings.goodwill) {
				sessionToUpdate.featureSettings.goodwill.thresholds.push({ level: 0, prompt_addon: '' });
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	function removeThreshold(index: number) {
		sessions.update(allSessions => {
			const sessionToUpdate = allSessions.find(s => s.id === $page.params.id);
			if (sessionToUpdate?.featureSettings.goodwill) {
				sessionToUpdate.featureSettings.goodwill.thresholds.splice(index, 1);
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	// ▲▲▲ ここまで ▲▲▲
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
		{@const goodwill = $currentSession.featureSettings.goodwill}
		<div class="space-y-6">
			<!-- 表示モード設定 -->
			<div class="p-4 border rounded-lg">
				<h2 class="text-lg font-semibold mb-3">表示設定</h2>
				<p class="text-sm text-gray-600 mb-4">チャット画面の見た目を切り替えます。</p>
				<!-- [修正] bind:group をやめ、checked と on:change を使用 -->
				<div class="flex gap-4">
					<label class="flex items-center gap-2 p-3 border rounded-md cursor-pointer has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
						<input
							type="radio"
							name="view-mode"
							value="standard"
							checked={$currentSession.viewMode === 'standard' || !$currentSession.viewMode}
							on:change={handleViewModeChange}
						/>
						<span>標準モード</span>
					</label>
					<label class="flex items-center gap-2 p-3 border rounded-md cursor-pointer has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500">
						<input
							type="radio"
							name="view-mode"
							value="game"
							checked={$currentSession.viewMode === 'game'}
							on:change={handleViewModeChange}
						/>
						<span>ゲーム風モード</span>
					</label>
				</div>
			</div>

			<!-- 好感度機能設定 -->
			{#if goodwill}
				<div class="p-4 border rounded-lg">
					<h2 class="text-lg font-semibold mb-3">好感度機能</h2>
					<label class="flex items-center justify-between cursor-pointer">
						<span>この機能を有効にする</span>
						<!-- [修正] bind:checked をやめ、checked と on:change を使用 -->
						<input
							type="checkbox"
							class="toggle"
							checked={goodwill.isEnabled}
							on:change={handleGoodwillEnabledChange}
						/>
					</label>

					{#if goodwill.isEnabled}
						<div class="mt-4 space-y-4">
							<div>
								<label for="goodwill-desc" class="block mb-2 font-medium">AIへの指示 (description)</label>
								<!-- [修正] bind:value をやめ、value と on:input を使用 -->
								<textarea
									id="goodwill-desc"
									class="w-full p-2 border rounded textarea"
									placeholder="例: キャラクターの好感度の増減を2から-2までの5段階評価"
									value={goodwill.descriptionForAI || ''}
									on:input={handleDescriptionChange}
								></textarea>
							</div>

							<div>
								<h3 class="font-medium mb-2">好感度によるAIの応答変化ルール</h3>
								<div class="space-y-3">
									{#each goodwill.thresholds as threshold, i (i)}
										<div class="flex items-start gap-2 p-2 border rounded-md bg-gray-50">
											<div class="flex-none">
												<label for="level-{i}" class="text-sm font-bold">Level</label>
												<!-- [修正] bind:value をやめ、value と on:input を使用 -->
												<input
													id="level-{i}"
													type="number"
													class="input input-bordered w-24"
													value={threshold.level}
													on:input={(e) => handleThresholdChange(i, 'level', e)}
												/>
											</div>
											<div class="flex-grow">
												<label for="prompt-{i}" class="text-sm font-bold">追加プロンプト</label>
												<!-- [修正] bind:value をやめ、value と on:input を使用 -->
												<textarea
													id="prompt-{i}"
													class="textarea textarea-bordered w-full h-20"
													placeholder="このレベルの時にAIに追加される指示"
													value={threshold.prompt_addon}
													on:input={(e) => handleThresholdChange(i, 'prompt_addon', e)}
												></textarea>
											</div>
											<button
												class="btn btn-sm btn-circle btn-ghost mt-6"
												on:click={() => removeThreshold(i)}
												aria-label="Remove threshold {i}"
											>✕</button>
										</div>
									{/each}
									<button class="btn btn-sm btn-outline btn-primary mt-2" on:click={addThreshold}>+ ルールを追加</button>
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