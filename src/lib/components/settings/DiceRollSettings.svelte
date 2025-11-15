<!-- src/lib/components/settings/DiceRollSettings.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { sessions } from '$lib/stores';
	import { derived } from 'svelte/store';
	import { generateUUID } from '$lib/utils';

	const sessionId = derived(page, ($page) => $page.params.id);
	const currentSession = derived([sessions, sessionId], ([$sessions, $sessionId]) =>
		$sessions.find((s) => s.id === $sessionId)
	);

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

	// 新しいダイスロール設定を追加する関数
	function addDiceRoll() {
		updateSession((session) => {
			if (!session.diceRolls) {
				session.diceRolls = [];
			}
			session.diceRolls.push({
				id: generateUUID(),
				isEnabled: true,
				instructionText: '',
				diceCount: 1,
				diceType: 100
			});
		});
	}

	// ダイスロール設定を削除する関数
	function removeDiceRoll(id: string) {
		updateSession((session) => {
			if (session.diceRolls) {
				session.diceRolls = session.diceRolls.filter((d) => d.id !== id);
			}
		});
	}

	// 特定のダイスロール設定のプロパティを更新する関数
	function handleDiceRollChange(
		diceRollId: string,
		field: 'isEnabled' | 'instructionText' | 'diceCount' | 'diceType',
		value: boolean | string | number
	) {
		updateSession((session) => {
			const diceRollToUpdate = session.diceRolls?.find((d) => d.id === diceRollId);
			if (!diceRollToUpdate) return;

			if (field === 'diceCount' || field === 'diceType') {
				diceRollToUpdate[field] = Math.max(1, Number(value));
			} else {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				diceRollToUpdate[field] = value;
			}
		});
	}
</script>

<div class="space-y-4">
	<div>
		<h3 class="font-medium">ダイスロール設定</h3>
		<p class="mb-3 text-xs text-gray-600">常時ダイスロールを同時に送信します。</p>
	</div>

	<!-- ダイスロール設定のリスト -->
	<div class="space-y-4">
		{#if $currentSession?.diceRolls}
			{#each $currentSession.diceRolls as diceRoll (diceRoll.id)}
				<div class="space-y-3 rounded-lg border bg-gray-50 p-3">
					<div class="flex items-center justify-between">
						<h4 class="font-semibold">ダイスロール</h4>
						<button
							class="rounded bg-gray-200 px-2 py-1 text-sm font-semibold text-gray-800 hover:bg-gray-300"
							on:click={() => removeDiceRoll(diceRoll.id)}
							aria-label="Remove dice roll"
						>
							✕
						</button>
					</div>

					<!-- 指示文章 -->
					<div>
						<label
							for="instructionText-{diceRoll.id}"
							class="mb-1 block text-sm font-medium text-gray-700">指示文章</label
						>
						<textarea
							id="instructionText-{diceRoll.id}"
							class="textarea textarea-bordered w-full"
							placeholder="例: 必要時に値を使用してください"
							rows="1"
							value={diceRoll.instructionText}
							on:input={(e) =>
								handleDiceRollChange(diceRoll.id, 'instructionText', e.currentTarget.value)}
						></textarea>
					</div>

					<div class="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
						<label class="flex items-center gap-2">
							<span class="text-sm font-medium text-gray-700">ダイスの数</span>
							<input
								type="number"
								id="diceCount-{diceRoll.id}"
								min="1"
								class="input input-bordered input-sm w-24"
								value={diceRoll.diceCount}
								on:input={(e) =>
									handleDiceRollChange(diceRoll.id, 'diceCount', e.currentTarget.value)}
							/>
						</label>
						<label class="flex items-center gap-2">
							<span class="text-sm font-medium text-gray-700">ダイスの面</span>
							<input
								type="number"
								id="diceType-{diceRoll.id}"
								min="1"
								placeholder="例: 6, 100"
								class="input input-bordered input-sm w-24"
								value={diceRoll.diceType}
								on:input={(e) =>
									handleDiceRollChange(diceRoll.id, 'diceType', e.currentTarget.value)}
							/>
						</label>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<button
		class="mt-3 rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
		on:click={addDiceRoll}
	>
		+ ダイスロールを追加
	</button>
</div>
