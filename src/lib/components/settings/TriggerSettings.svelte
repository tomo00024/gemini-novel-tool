<!-- src/lib/components/settings/TriggerSettings.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { sessions } from '$lib/stores';
	import { derived } from 'svelte/store';
	import type { Trigger, StatusUpdate } from '$lib/types';
	import { generateUUID } from '$lib/utils';

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

<div class="space-y-4">
	<h3 class="font-medium">トリガー設定</h3>
	<p class="mb-3 text-xs text-gray-600">上から順に条件が判定・実行されます。</p>

	<!-- トリガーのリスト -->
	<div class="space-y-4">
		{#if $currentSession?.triggers}
			{#each $currentSession.triggers as trigger, index (trigger.id)}
				<div class="space-y-3 rounded-lg border bg-gray-50 p-3">
					<!-- ヘッダー (トリガー名 + 操作ボタン) -->
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="text-sm font-semibold text-gray-500">#{index + 1}</span>
							<h4 class="font-semibold">トリガー条件</h4>
						</div>
						<div class="flex items-center gap-1">
							<button
								class="btn btn-xs btn-ghost px-1"
								disabled={index === 0}
								on:click={() => moveTrigger(index, 'up')}>↑</button
							>
							<button
								class="btn btn-xs btn-ghost px-1"
								disabled={index === ($currentSession.triggers?.length || 0) - 1}
								on:click={() => moveTrigger(index, 'down')}>↓</button
							>
							<div class="divider divider-horizontal mx-1 h-4 self-center"></div>
							<button
								class="rounded bg-gray-200 px-2 py-1 text-sm font-semibold text-gray-800 hover:bg-gray-300"
								on:click={() => removeTrigger(trigger.id)}
								aria-label="Remove trigger"
							>
								✕
							</button>
						</div>
					</div>

					<!-- 条件 (If) -->
					<div class="space-y-2 rounded-md border bg-white p-2">
						<p class="text-sm font-semibold">If (もし)</p>
						<div class="space-y-3">
							{#each trigger.conditions as condition, j (condition.id)}
								<div class="space-y-2">
									<div class="flex flex-wrap items-center gap-2">
										<select
											class="select select-bordered select-sm min-w-[120px] flex-1"
											value={condition.statusId}
											on:change={(e) =>
												handleConditionChange(
													trigger.id,
													condition.id,
													'statusId',
													e.currentTarget.value
												)}
										>
											<option disabled value="">ステータス</option>
											{#if $currentSession.customStatuses}
												{#each $currentSession.customStatuses as status}
													<option value={status.id}>{status.name}</option>
												{/each}
											{/if}
										</select>

										<select
											class="select select-bordered select-sm w-20"
											value={condition.operator}
											on:change={(e) =>
												handleConditionChange(
													trigger.id,
													condition.id,
													'operator',
													e.currentTarget.value
												)}
										>
											<option value="==">==</option>
											<option value=">=">&gt;=</option>
											<option value=">">&gt;</option>
											<option value="<=">&lt;=</option>
											<option value="<">&lt;</option>
										</select>

										<input
											type="number"
											class="input input-bordered input-sm w-20"
											value={condition.value}
											on:input={(e) =>
												handleConditionChange(
													trigger.id,
													condition.id,
													'value',
													e.currentTarget.value
												)}
										/>

										{#if trigger.conditions.length > 1}
											<button
												class="rounded bg-gray-200 px-2 py-1 text-sm font-semibold text-gray-800 hover:bg-gray-300"
												on:click={() => removeCondition(trigger, condition.id)}
											>
												✕
											</button>
										{/if}
									</div>

									{#if j < trigger.conditions.length - 1}
										<div class="flex justify-center">
											<select
												class="select select-bordered select-xs w-20 text-center"
												value={trigger.conjunctions[j]}
												on:change={(e) =>
													handleConjunctionChange(
														trigger.id,
														j,
														e.currentTarget.value as 'AND' | 'OR'
													)}
											>
												<option value="AND">AND</option>
												<option value="OR">OR</option>
											</select>
										</div>
									{/if}
								</div>
							{/each}
						</div>
						<button
							class="mt-1 rounded bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 hover:bg-gray-300"
							on:click={() => addCondition(trigger)}
						>
							+ 条件を追加
						</button>
					</div>

					<!-- 実行内容 (Then) -->
					<div class="space-y-2 rounded-md border bg-white p-2">
						<div class="flex items-center justify-between">
							<p class="text-sm font-semibold">Then (ならば)</p>
						</div>

						<!-- タブ切り替え -->
						<div class="tabs tabs-boxed bg-gray-100 p-1">
							<button
								class="tab h-8 min-h-0 flex-1 text-xs {!activeTabMap[trigger.id] ||
								activeTabMap[trigger.id] === 'response'
									? 'tab-active bg-white shadow-sm'
									: ''}"
								on:click={() => toggleTab(trigger.id, 'response')}
							>
								💬 AI応答
							</button>
							<button
								class="tab h-8 min-h-0 flex-1 text-xs {activeTabMap[trigger.id] === 'status'
									? 'tab-active bg-white shadow-sm'
									: ''}"
								on:click={() => toggleTab(trigger.id, 'status')}
							>
								⚡ ステータス
								{#if trigger.statusUpdates && trigger.statusUpdates.length > 0}
									<span class="badge badge-xs ml-1 bg-gray-600 text-white"
										>{trigger.statusUpdates.length}</span
									>
								{/if}
							</button>
						</div>

						<!-- タブ内容: AI応答 -->
						<div
							class={!activeTabMap[trigger.id] || activeTabMap[trigger.id] === 'response'
								? 'block space-y-2'
								: 'hidden'}
						>
							<div class="flex items-center justify-between">
								<span class="text-xs text-gray-500">実行タイミング:</span>
								<select
									class="select select-bordered select-xs"
									value={trigger.executionType}
									on:change={(e) =>
										handleTriggerChange(trigger.id, 'executionType', e.currentTarget.value)}
								>
									<option value="once">一度だけ</option>
									<option value="persistent">条件合致中ずっと</option>
									<option value="on-threshold-cross">毎回(閾値をまたぐ時)</option>
								</select>
							</div>
							<textarea
								class="textarea textarea-bordered w-full text-sm"
								rows="2"
								placeholder="AIへの追加指示（例: プレイヤーがダメージを受けた描写をして）"
								value={trigger.responseText}
								on:input={(e) =>
									handleTriggerChange(trigger.id, 'responseText', e.currentTarget.value)}
							></textarea>
						</div>

						<!-- タブ内容: ステータス -->
						<div class={activeTabMap[trigger.id] === 'status' ? 'block space-y-2' : 'hidden'}>
							{#if trigger.statusUpdates && trigger.statusUpdates.length > 0}
								{#each trigger.statusUpdates as update, k}
									<div class="flex items-center gap-2">
										<select
											class="select select-bordered select-sm min-w-[100px] flex-1"
											value={update.targetStatusId}
											on:change={(e) =>
												handleStatusUpdateChange(
													trigger.id,
													k,
													'targetStatusId',
													e.currentTarget.value
												)}
										>
											<option disabled value="">対象</option>
											{#if $currentSession.customStatuses}
												{#each $currentSession.customStatuses as status}
													<option value={status.id}>{status.name}</option>
												{/each}
											{/if}
										</select>

										<select
											class="select select-bordered select-sm w-[70px]"
											value={update.operation}
											on:change={(e) =>
												handleStatusUpdateChange(trigger.id, k, 'operation', e.currentTarget.value)}
										>
											<option value="set">=</option>
											<option value="add">+</option>
											<option value="sub">-</option>
										</select>

										<input
											type="number"
											class="input input-bordered input-sm w-16"
											value={update.value}
											on:input={(e) =>
												handleStatusUpdateChange(trigger.id, k, 'value', e.currentTarget.value)}
										/>
										<button
											class="rounded bg-gray-200 px-2 py-1 text-sm font-semibold text-gray-800 hover:bg-gray-300"
											on:click={() => removeStatusUpdate(trigger.id, k)}
										>
											✕
										</button>
									</div>
								{/each}
							{:else}
								<p class="py-2 text-center text-xs text-gray-400">設定なし</p>
							{/if}
							<button
								class="mt-1 w-full rounded bg-gray-100 py-1 text-xs text-gray-600 hover:bg-gray-200"
								on:click={() => addStatusUpdate(trigger.id)}
							>
								+ ステータス変動を追加
							</button>
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<button
		class="mt-3 rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
		on:click={addTrigger}
	>
		+ トリガーを追加
	</button>
</div>
