<!-- src/lib/components/settings/TriggerSettings.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { sessions } from '$lib/stores';
	import { derived } from 'svelte/store';
	import type { Trigger, StatusUpdate } from '$lib/types';
	import { generateUUID } from '$lib/utils';
	import Section from '$lib/components/ui/Section.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Select from '$lib/components/ui/Select.svelte';
	import Textarea from '$lib/components/ui/Textarea.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	const sessionId = derived(page, ($page) => $page.params.id);
	const currentSession = derived([sessions, sessionId], ([$sessions, $sessionId]) =>
		$sessions.find((s) => s.id === $sessionId)
	);

	// タブの状態管理
	let activeTabMap: Record<string, 'response' | 'status'> = {};

	function toggleTab(triggerId: string, tab: 'response' | 'status') {
		activeTabMap[triggerId] = tab;
		activeTabMap = { ...activeTabMap };
	}

	// ストア更新ヘルパー
	function updateSession(updater: (session: NonNullable<typeof $currentSession>) => void) {
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate) {
				updater(sessionToUpdate);
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}

	// --- トリガー操作 ---
	function addTrigger() {
		updateSession((session) => {
			if (!session.triggers) session.triggers = [];
			session.triggers.push({
				id: generateUUID(),
				conditions: [{ id: generateUUID(), statusId: '', operator: '>=', value: 0 }],
				conjunctions: [],
				executionType: 'once',
				responseText: '',
				statusUpdates: [],
				hasBeenExecuted: false,
				lastEvaluationResult: false
			});
		});
	}

	function removeTrigger(id: string) {
		updateSession((session) => {
			if (session.triggers) {
				session.triggers = session.triggers.filter((t) => t.id !== id);
			}
		});
	}

	function moveTrigger(index: number, direction: 'up' | 'down') {
		updateSession((session) => {
			if (!session.triggers) return;
			const triggers = session.triggers;
			const targetIndex = direction === 'up' ? index - 1 : index + 1;

			if (targetIndex >= 0 && targetIndex < triggers.length) {
				[triggers[index], triggers[targetIndex]] = [triggers[targetIndex], triggers[index]];
			}
		});
	}

	// --- ステータス更新設定の操作 ---
	function addStatusUpdate(triggerId: string) {
		updateSession((session) => {
			const trigger = session.triggers?.find((t) => t.id === triggerId);
			if (trigger) {
				if (!trigger.statusUpdates) trigger.statusUpdates = [];
				trigger.statusUpdates.push({
					targetStatusId: '',
					operation: 'set',
					value: 0
				});
				toggleTab(triggerId, 'status');
			}
		});
	}

	function removeStatusUpdate(triggerId: string, index: number) {
		updateSession((session) => {
			const trigger = session.triggers?.find((t) => t.id === triggerId);
			if (trigger && trigger.statusUpdates) {
				trigger.statusUpdates.splice(index, 1);
			}
		});
	}

	function handleStatusUpdateChange(
		triggerId: string,
		index: number,
		field: keyof StatusUpdate,
		value: string | number
	) {
		updateSession((session) => {
			const trigger = session.triggers?.find((t) => t.id === triggerId);
			if (trigger && trigger.statusUpdates && trigger.statusUpdates[index]) {
				// @ts-ignore
				trigger.statusUpdates[index][field] = field === 'value' ? Number(value) : value;
			}
		});
	}

	// --- 条件・プロパティ更新 ---
	function handleTriggerChange(
		triggerId: string,
		field: 'executionType' | 'responseText',
		value: string
	) {
		updateSession((session) => {
			const trigger = session.triggers?.find((t) => t.id === triggerId);
			if (trigger) (trigger[field] as string) = value;
		});
	}

	function handleConditionChange(
		triggerId: string,
		conditionId: string,
		field: string,
		value: string | number
	) {
		updateSession((session) => {
			const trigger = session.triggers?.find((t) => t.id === triggerId);
			const condition = trigger?.conditions.find((c) => c.id === conditionId);
			if (condition) {
				// @ts-ignore
				condition[field] = field === 'value' ? Number(value) : value;
			}
		});
	}

	function handleConjunctionChange(triggerId: string, index: number, value: 'AND' | 'OR') {
		updateSession((session) => {
			const trigger = session.triggers?.find((t) => t.id === triggerId);
			if (trigger) trigger.conjunctions[index] = value;
		});
	}

	function addCondition(trigger: Trigger) {
		updateSession((session) => {
			const t = session.triggers?.find((item) => item.id === trigger.id);
			if (t) {
				t.conditions.push({
					id: generateUUID(),
					statusId: '',
					operator: '>=',
					value: 0
				});
				if (t.conditions.length > 1) t.conjunctions.push('AND');
			}
		});
	}

	function removeCondition(trigger: Trigger, conditionId: string) {
		updateSession((session) => {
			const t = session.triggers?.find((item) => item.id === trigger.id);
			if (t) {
				const idx = t.conditions.findIndex((c) => c.id === conditionId);
				if (idx === -1) return;
				t.conditions.splice(idx, 1);
				if (t.conditions.length < 2) t.conjunctions = [];
				else if (t.conjunctions.length > 0) t.conjunctions.splice(Math.max(0, idx - 1), 1);
			}
		});
	}
</script>

<Section title="トリガー設定">
	<p class="mb-3 text-xs text-text-sub">上から順に条件が判定・実行されます。</p>

	<!-- トリガーのリスト -->
	<div class="space-y-6">
		{#if $currentSession?.triggers}
			{#each $currentSession.triggers as trigger, index (trigger.id)}
				<div class="rounded-lg border border-bg-border-main bg-transparent p-4">
					<!-- ヘッダー (トリガー名 + 操作ボタン) -->
					<div class="mb-4 flex items-center justify-between border-b border-bg-border-main pb-2">
						<div class="flex items-center gap-2">
							<span class="text-sm font-semibold text-text-sub">#{index + 1}</span>
							<h4 class="font-semibold text-text-main">トリガー条件</h4>
						</div>
						<div class="flex items-center gap-1">
							<Button
								variant="primary"
								class="px-2 py-1 text-xs"
								disabled={index === 0}
								on:click={() => moveTrigger(index, 'up')}>↑</Button
							>
							<Button
								variant="primary"
								class="px-2 py-1 text-xs"
								disabled={index === ($currentSession.triggers?.length || 0) - 1}
								on:click={() => moveTrigger(index, 'down')}>↓</Button
							>
							<div
								class="divider divider-horizontal mx-2 h-4 w-[1px] self-center bg-bg-border-main"
							></div>
							<button
								type="button"
								class="rounded-md p-1 text-text-sub hover:bg-bg-hover hover:text-text-main focus:ring-2 focus:ring-bg-border-main focus:outline-none"
								on:click={() => removeTrigger(trigger.id)}
								aria-label="Remove trigger"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>
					</div>

					<!-- 条件 (If) -->
					<div class="mb-4 space-y-2">
						<p class="text-sm font-semibold text-text-sub">If (もし)</p>
						<div class="space-y-3 pl-2">
							{#each trigger.conditions as condition, j (condition.id)}
								<div class="space-y-2">
									<div class="flex flex-wrap items-center gap-2">
										<div class="min-w-[120px] flex-1">
											<Select
												value={condition.statusId}
												class="w-full"
												on:change={(e) =>
													handleConditionChange(
														trigger.id,
														condition.id,
														'statusId',
														(e.target as HTMLSelectElement).value
													)}
											>
												<option disabled value="">ステータス</option>
												{#if $currentSession.customStatuses}
													{#each $currentSession.customStatuses as status}
														<option value={status.id}>{status.name}</option>
													{/each}
												{/if}
											</Select>
										</div>

										<div class="w-24">
											<Select
												value={condition.operator}
												class="w-full"
												on:change={(e) =>
													handleConditionChange(
														trigger.id,
														condition.id,
														'operator',
														(e.target as HTMLSelectElement).value
													)}
											>
												<option value="==">==</option>
												<option value=">=">&gt;=</option>
												<option value=">">&gt;</option>
												<option value="<=">&lt;=</option>
												<option value="<">&lt;</option>
											</Select>
										</div>

										<Input
											type="number"
											class="w-24"
											value={condition.value}
											on:input={(e) =>
												handleConditionChange(
													trigger.id,
													condition.id,
													'value',
													(e.target as HTMLInputElement).value
												)}
										/>

										{#if trigger.conditions.length > 1}
											<button
												type="button"
												class="rounded-md p-1 text-text-sub hover:bg-bg-hover hover:text-text-main focus:ring-2 focus:ring-bg-border-main focus:outline-none"
												on:click={() => removeCondition(trigger, condition.id)}
												aria-label="Remove condition"
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													class="h-5 w-5"
													fill="none"
													viewBox="0 0 24 24"
													stroke="currentColor"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M6 18L18 6M6 6l12 12"
													/>
												</svg>
											</button>
										{/if}
									</div>

									{#if j < trigger.conditions.length - 1}
										<div class="flex justify-center">
											<div class="w-24">
												<Select
													class="text-center"
													value={trigger.conjunctions[j]}
													on:change={(e) =>
														handleConjunctionChange(
															trigger.id,
															j,
															(e.target as HTMLSelectElement).value as 'AND' | 'OR'
														)}
												>
													<option value="AND">AND</option>
													<option value="OR">OR</option>
												</Select>
											</div>
										</div>
									{/if}
								</div>
							{/each}
						</div>
						<Button
							variant="primary"
							class="mt-2 px-3 py-1 text-xs"
							on:click={() => addCondition(trigger)}
						>
							+ 条件を追加
						</Button>
					</div>

					<!-- 実行内容 (Then) -->
					<div class="space-y-2 border-t border-bg-border-main pt-4">
						<div class="flex items-center justify-between">
							<p class="text-sm font-semibold text-text-sub">Then (ならば)</p>
						</div>

						<!-- タブ切り替え -->
						<div class="flex overflow-hidden rounded-lg border border-bg-border-main">
							<button
								class="flex-1 py-2 text-xs font-medium transition-colors {!activeTabMap[
									trigger.id
								] || activeTabMap[trigger.id] === 'response'
									? 'bg-btn-primary-bg text-text-main'
									: 'bg-transparent text-text-sub hover:bg-bg-hover hover:text-text-main'}"
								on:click={() => toggleTab(trigger.id, 'response')}
							>
								AI応答
							</button>
							<div class="w-[1px] bg-bg-border-main"></div>
							<button
								class="flex-1 py-2 text-xs font-medium transition-colors {activeTabMap[
									trigger.id
								] === 'status'
									? 'bg-btn-primary-bg text-text-main'
									: 'bg-transparent text-text-sub hover:bg-bg-hover hover:text-text-main'}"
								on:click={() => toggleTab(trigger.id, 'status')}
							>
								ステータス
								{#if trigger.statusUpdates && trigger.statusUpdates.length > 0}
									<span
										class="ml-1 rounded-full bg-bg-border-main px-1.5 py-0.5 text-[10px] text-white"
										>{trigger.statusUpdates.length}</span
									>
								{/if}
							</button>
						</div>

						<!-- タブ内容: AI応答 -->
						<div
							class={!activeTabMap[trigger.id] || activeTabMap[trigger.id] === 'response'
								? 'block space-y-3 pt-2'
								: 'hidden'}
						>
							<div class="flex items-center justify-between">
								<span class="text-xs text-text-sub">実行タイミング:</span>
								<div class="w-48">
									<Select
										value={trigger.executionType}
										class="text-xs"
										on:change={(e) =>
											handleTriggerChange(
												trigger.id,
												'executionType',
												(e.target as HTMLSelectElement).value
											)}
									>
										<option value="once">一度だけ</option>
										<option value="persistent">条件合致中ずっと</option>
										<option value="on-threshold-cross">毎回(閾値をまたぐ時)</option>
									</Select>
								</div>
							</div>
							<Textarea
								class="w-full text-sm"
								rows={2}
								placeholder="AIへの追加指示（例: プレイヤーがダメージを受けた描写をして）"
								value={trigger.responseText}
								on:input={(e) =>
									handleTriggerChange(
										trigger.id,
										'responseText',
										(e.target as HTMLTextAreaElement).value
									)}
							/>
						</div>

						<!-- タブ内容: ステータス -->
						<div class={activeTabMap[trigger.id] === 'status' ? 'block space-y-3 pt-2' : 'hidden'}>
							{#if trigger.statusUpdates && trigger.statusUpdates.length > 0}
								{#each trigger.statusUpdates as update, k}
									<div class="flex items-center gap-2">
										<div class="min-w-[100px] flex-1">
											<Select
												value={update.targetStatusId}
												class="w-full"
												on:change={(e) =>
													handleStatusUpdateChange(
														trigger.id,
														k,
														'targetStatusId',
														(e.target as HTMLSelectElement).value
													)}
											>
												<option disabled value="">対象</option>
												{#if $currentSession.customStatuses}
													{#each $currentSession.customStatuses as status}
														<option value={status.id}>{status.name}</option>
													{/each}
												{/if}
											</Select>
										</div>

										<div class="w-20">
											<Select
												value={update.operation}
												class="w-full"
												on:change={(e) =>
													handleStatusUpdateChange(
														trigger.id,
														k,
														'operation',
														(e.target as HTMLSelectElement).value
													)}
											>
												<option value="set">=</option>
												<option value="add">+</option>
												<option value="sub">-</option>
											</Select>
										</div>

										<Input
											type="number"
											class="w-20"
											value={update.value}
											on:input={(e) =>
												handleStatusUpdateChange(
													trigger.id,
													k,
													'value',
													(e.target as HTMLInputElement).value
												)}
										/>
										<button
											type="button"
											class="rounded-md p-1 text-text-sub hover:bg-bg-hover hover:text-text-main focus:ring-2 focus:ring-bg-border-main focus:outline-none"
											on:click={() => removeStatusUpdate(trigger.id, k)}
											aria-label="Remove status update"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												class="h-5 w-5"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M6 18L18 6M6 6l12 12"
												/>
											</svg>
										</button>
									</div>
								{/each}
							{:else}
								<p class="py-2 text-center text-xs text-text-sub">設定なし</p>
							{/if}
							<Button
								variant="primary"
								class="mt-1 py-1 text-xs"
								on:click={() => addStatusUpdate(trigger.id)}
							>
								+ ステータス変動を追加
							</Button>
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<Button class="mt-4" on:click={addTrigger}>+ トリガーを追加</Button>
</Section>
