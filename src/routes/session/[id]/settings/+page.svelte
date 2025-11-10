<!-- src/routes/session/[id]/settings/+page.svelte -->

<script lang="ts">
	/**
	 * @file このファイルは、特定のセッション（:idで指定）に関する設定ページを定義します。
	 * (ファイルコメントは変更なし)
	 */
	import { page } from '$app/stores';
	import { sessions } from '$lib/stores';
	import { derived } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';
	import type { GameViewSettings } from '$lib/types';

	const sessionId = derived(page, ($page) => $page.params.id);
	const currentSession = derived([sessions, sessionId], ([$sessions, $sessionId]) =>
		$sessions.find((s) => s.id === $sessionId)
	);

	onMount(() => {
		if (!$sessions.some((s) => s.id === $page.params.id)) {
			goto(base || '/');
			return;
		}

		// データマイグレーション処理 (変更なし)
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate) {
				if (typeof sessionToUpdate.viewMode === 'undefined') sessionToUpdate.viewMode = 'standard';

				if (typeof sessionToUpdate.gameViewSettings === 'undefined') {
					sessionToUpdate.gameViewSettings = {
						imageBaseUrl: 'https://dashing-fenglisu-4c8446.netlify.app',
						imageExtension: '.avif',
						customStatuses: [
							{
								id: crypto.randomUUID(),
								name: '日付',
								currentValue: '1',
								mode: 'set',
								isVisible: true
							},
							{
								id: crypto.randomUUID(),
								name: '好感度',
								currentValue: '0',
								mode: 'add',
								isVisible: true
							}
						]
					};
				} else {
					const settings = sessionToUpdate.gameViewSettings;
					const oldSettings = settings as any;

					if (typeof settings.customStatuses === 'undefined') {
						settings.customStatuses = [];
					}

					let dateStatus = settings.customStatuses.find((s) => s.name === '日付');
					if (!dateStatus) {
						settings.customStatuses.unshift({
							id: crypto.randomUUID(),
							name: '日付',
							currentValue: '1',
							mode: 'set',
							isVisible: typeof oldSettings.showDate === 'boolean' ? oldSettings.showDate : true
						});
					}

					let favorabilityStatus = settings.customStatuses.find((s) => s.name === '好感度');
					if (!favorabilityStatus) {
						settings.customStatuses.push({
							id: crypto.randomUUID(),
							name: '好感度',
							currentValue: '0',
							mode: 'add',
							isVisible:
								typeof oldSettings.showFavorability === 'boolean'
									? oldSettings.showFavorability
									: true
						});
					}

					settings.customStatuses.forEach((status) => {
						if (typeof status.isVisible === 'undefined') {
							status.isVisible = true;
						}
						if (typeof status.mode === 'undefined') {
							status.mode = status.name === '好感度' ? 'add' : 'set';
						}
					});

					delete oldSettings.showDate;
					delete oldSettings.showFavorability;
				}
			}
			return allSessions;
		});
	});

	function handleSessionModeChange(event: Event) {
		const newMode = (event.target as HTMLInputElement).value as
			| 'standard'
			| 'game'
			| 'oneStepFC'
			| 'twoStepFC';

		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate) {
				sessionToUpdate.viewMode = 'standard';
				sessionToUpdate.featureSettings.apiMode = 'standard';

				switch (newMode) {
					case 'game':
						sessionToUpdate.viewMode = 'game';
						break;
					case 'oneStepFC':
						sessionToUpdate.featureSettings.apiMode = 'oneStepFC';
						break;
					case 'twoStepFC':
						sessionToUpdate.featureSettings.apiMode = 'twoStepFC';
						break;
					case 'standard':
					default:
						break;
				}
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	function addCustomStatus() {
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.gameViewSettings) {
				sessionToUpdate.gameViewSettings.customStatuses.push({
					id: crypto.randomUUID(),
					name: '',
					currentValue: '0',
					mode: 'set',
					isVisible: true
				});
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	function handleGameViewSettingChange(field: 'imageBaseUrl' | 'imageExtension', event: Event) {
		const newValue = (event.target as HTMLInputElement).value;
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.gameViewSettings) {
				sessionToUpdate.gameViewSettings[field] = newValue;
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	function handleCustomStatusChange(id: string, field: 'name' | 'currentValue', event: Event) {
		const newValue = (event.target as HTMLInputElement).value;
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.gameViewSettings) {
				const statusToUpdate = sessionToUpdate.gameViewSettings.customStatuses.find(
					(s) => s.id === id
				);
				if (statusToUpdate) {
					statusToUpdate[field] = newValue;
					sessionToUpdate.lastUpdatedAt = new Date().toISOString();
				}
			}
			return allSessions;
		});
	}

	function handleCustomStatusModeChange(id: string, newMode: 'add' | 'set') {
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.gameViewSettings) {
				const statusToUpdate = sessionToUpdate.gameViewSettings.customStatuses.find(
					(s) => s.id === id
				);
				if (statusToUpdate) {
					statusToUpdate.mode = newMode;
					sessionToUpdate.lastUpdatedAt = new Date().toISOString();
				}
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
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.featureSettings.goodwill) {
				sessionToUpdate.featureSettings.goodwill.thresholds.push({ level: 0, prompt_addon: '' });
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

	function removeCustomStatus(id: string) {
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.gameViewSettings) {
				const statuses = sessionToUpdate.gameViewSettings.customStatuses;
				sessionToUpdate.gameViewSettings.customStatuses = statuses.filter((s) => s.id !== id);
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	function handleCustomStatusVisibilityChange(id: string, isVisible: boolean) {
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate?.gameViewSettings) {
				const statusToUpdate = sessionToUpdate.gameViewSettings.customStatuses.find(
					(s) => s.id === id
				);
				if (statusToUpdate) {
					statusToUpdate.isVisible = isVisible;
					sessionToUpdate.lastUpdatedAt = new Date().toISOString();
				}
			}
			return allSessions;
		});
	}
</script>

<div class="flex h-screen flex-col p-4">
	<!-- ヘッダー部分 -->
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold">セッション設定</h1>
		<a
			href="{base}/session/{$sessionId}"
			class="rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
		>
			セッションに戻る
		</a>
	</div>

	{#if $currentSession}
		{@const goodwill = $currentSession.featureSettings.goodwill}
		{@const apiMode = $currentSession.featureSettings.apiMode}

		<div class="space-y-6">
			<!-- 通常モード -->
			<div class="rounded-lg border p-4">
				<label class="flex cursor-pointer items-center justify-between">
					<div>
						<h2 class="text-lg font-semibold">通常モード</h2>
						<p class="text-sm text-gray-600">標準的なチャットモードです。</p>
					</div>
					<input
						type="radio"
						name="session-mode"
						value="standard"
						checked={$currentSession.viewMode === 'standard' && apiMode === 'standard'}
						on:change={handleSessionModeChange}
					/>
				</label>
			</div>

			<!-- ゲーム風モード -->
			<div class="rounded-lg border p-4">
				<label class="flex cursor-pointer items-center justify-between">
					<div>
						<h2 class="text-lg font-semibold">ゲーム風モード</h2>
						<p class="text-sm text-gray-600">チャット画面の見た目をゲーム風に切り替えます。</p>
					</div>
					<input
						type="radio"
						name="session-mode"
						value="game"
						checked={$currentSession.viewMode === 'game'}
						on:change={handleSessionModeChange}
					/>
				</label>

				{#if $currentSession.viewMode === 'game' && $currentSession.gameViewSettings}
					<div class="mt-4 space-y-6 border-t pt-4">
						<!-- ▼▼▼ [変更] 画像設定のUIをここに追加 ▼▼▼ -->
						<div class="space-y-4">
							<h3 class="font-medium">画像設定</h3>
							<div>
								<label for="image-base-url" class="mb-1 block text-sm text-gray-700"
									>画像ベースURL</label
								>
								<input
									id="image-base-url"
									type="text"
									class="input input-bordered w-full"
									placeholder="https://..."
									value={$currentSession.gameViewSettings.imageBaseUrl}
									on:input={(e) => handleGameViewSettingChange('imageBaseUrl', e)}
								/>
							</div>
							<div>
								<label for="image-extension" class="mb-1 block text-sm text-gray-700"
									>画像拡張子</label
								>
								<input
									id="image-extension"
									type="text"
									class="input input-bordered w-full"
									placeholder=".avif, .webp, .png など"
									value={$currentSession.gameViewSettings.imageExtension}
									on:input={(e) => handleGameViewSettingChange('imageExtension', e)}
								/>
							</div>
						</div>
						<!-- ▲▲▲ 変更ここまで ▲▲▲ -->

						<div class="space-y-4">
							<h3 class="font-medium">ステータス設定</h3>
							<div>
								<h4 class="mb-2 text-sm font-semibold text-gray-800">ステータス一覧</h4>
								<p class="mb-3 text-xs text-gray-600">
									AIに `&#123;&#123;ステータス名: 値&#125;&#125;`
									のように指示すると、各ステータスで設定された計算方法で値が変動します。
								</p>
								<div class="space-y-3">
									{#each $currentSession.gameViewSettings.customStatuses as status (status.id)}
										<div
											class="grid grid-cols-[1fr_1fr_auto] items-center gap-x-3 gap-y-1 rounded-md border bg-gray-50 p-2"
										>
											<!-- 行 1: 入力欄 -->
											<input
												type="text"
												class="input input-bordered w-full"
												placeholder="ステータス名"
												value={status.name}
												on:input={(e) => handleCustomStatusChange(status.id, 'name', e)}
												disabled={status.name === '好感度' || status.name === '日付'}
											/>
											<input
												type="text"
												class="input input-bordered w-full"
												placeholder="現在の値"
												value={status.currentValue}
												on:input={(e) => handleCustomStatusChange(status.id, 'currentValue', e)}
											/>
											<button
												class="btn btn-sm btn-circle btn-ghost"
												on:click={() => removeCustomStatus(status.id)}
												aria-label="Remove status {status.name}"
												disabled={status.name === '好感度' || status.name === '日付'}
											>
												✕
											</button>

											<!-- 行 2: オプション -->
											<div
												class="col-span-full mt-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 pl-1"
											>
												<div class="flex items-center gap-4">
													<span class="text-xs text-gray-600">計算:</span>
													<label class="flex cursor-pointer items-center gap-1.5">
														<input
															type="radio"
															name="mode-{status.id}"
															value="add"
															checked={status.mode === 'add'}
															on:change={() => handleCustomStatusModeChange(status.id, 'add')}
														/>
														<span class="text-sm">加算</span>
													</label>
													<label class="flex cursor-pointer items-center gap-1.5">
														<input
															type="radio"
															name="mode-{status.id}"
															value="set"
															checked={status.mode === 'set'}
															on:change={() => handleCustomStatusModeChange(status.id, 'set')}
														/>
														<span class="text-sm">上書き</span>
													</label>
												</div>
												<label class="flex cursor-pointer items-center gap-2">
													<input
														type="checkbox"
														class="checkbox checkbox-sm"
														checked={status.isVisible}
														on:change={(e) =>
															handleCustomStatusVisibilityChange(
																status.id,
																e.currentTarget.checked
															)}
													/>
													<span class="text-sm">画面に表示する</span>
												</label>
											</div>
										</div>
									{/each}
								</div>
								<button class="btn btn-sm btn-outline btn-primary mt-3" on:click={addCustomStatus}>
									+ ステータスを追加
								</button>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- 構造化出力モード -->
			<div class="rounded-lg border p-4">
				<label class="flex cursor-pointer items-center justify-between">
					<div>
						<h2 class="text-lg font-semibold">構造化出力モード（非推奨・試験版）</h2>
						<p class="text-sm text-gray-600">
							AIの応答に特定のデータ構造を含めるように指示します。
						</p>
					</div>
					<input
						type="radio"
						name="session-mode"
						value="oneStepFC"
						checked={apiMode === 'oneStepFC'}
						on:change={handleSessionModeChange}
					/>
				</label>

				{#if apiMode === 'oneStepFC'}
					<div class="mt-4 space-y-4 border-t pt-4">
						<div>
							<label for="goodwill-desc" class="mb-2 block font-medium"
								>AIへの指示 (description)</label
							>
							<textarea
								id="goodwill-desc"
								class="textarea w-full rounded border p-2"
								placeholder="例: キャラクターの好感度の増減を2から-2までの5段階評価"
								value={goodwill?.descriptionForAI || ''}
								on:input={handleDescriptionChange}
							></textarea>
						</div>

						<div>
							<h3 class="mb-2 font-medium">好感度によるAIの応答変化ルール</h3>
							<div class="space-y-3">
								{#if goodwill}
									{#each goodwill.thresholds as threshold, i (i)}
										<div class="flex items-start gap-2 rounded-md border bg-gray-50 p-2">
											<div class="flex-none">
												<label for="level-{i}" class="text-sm font-bold">Level</label>
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
												<textarea
													id="prompt-{i}"
													class="textarea textarea-bordered h-20 w-full"
													placeholder="このレベルの時にAIに追加される指示"
													value={threshold.prompt_addon}
													on:input={(e) => handleThresholdChange(i, 'prompt_addon', e)}
												></textarea>
											</div>
											<button
												class="btn btn-sm btn-circle btn-ghost mt-6"
												on:click={() => removeThreshold(i)}
												aria-label="Remove threshold {i}">✕</button
											>
										</div>
									{/each}
								{/if}
								<button class="btn btn-sm btn-outline btn-primary mt-2" on:click={addThreshold}
									>+ ルールを追加</button
								>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Function Callingモード -->
			<div class="rounded-lg border p-4">
				<label class="flex cursor-pointer items-center justify-between">
					<div>
						<h2 class="text-lg font-semibold">Function Callingモード（開発中）</h2>
						<p class="text-sm text-gray-600">より複雑な対話フローを実現するためのモードです。</p>
					</div>
					<input
						type="radio"
						name="session-mode"
						value="twoStepFC"
						checked={apiMode === 'twoStepFC'}
						on:change={handleSessionModeChange}
					/>
				</label>
				{#if apiMode === 'twoStepFC'}
					<div class="mt-4 border-t pt-4">
						<p class="text-sm text-gray-500">TwoStepFC用の設定項目はまだありません。</p>
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<p>セッション情報を読み込んでいます...</p>
	{/if}
</div>

<style>
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
