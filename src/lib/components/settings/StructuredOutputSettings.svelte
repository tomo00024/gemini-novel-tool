<!-- src/lib/components/settings/StructuredOutputSettings.svelte -->
<script lang="ts">
	import { page } from '$app/stores';
	import { sessions } from '$lib/stores';
	import { derived } from 'svelte/store';
	import type { Session } from '$lib/types';
	import type { Readable } from 'svelte/store';

	export let currentSession: Readable<Session | undefined>;
	export let onModeChange: (event: Event) => void;

	const sessionId = derived(page, ($page) => $page.params.id);
	const session = derived([sessions, sessionId], ([$sessions, $sessionId]) =>
		$sessions.find((s) => s.id === $sessionId)
	);
	const goodwill = derived(session, ($session) => $session?.featureSettings.goodwill);
	const apiMode = derived(
		currentSession,
		($currentSession) => $currentSession?.featureSettings.apiMode
	);

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
</script>

<div class="rounded-lg border p-4">
	<label class="flex cursor-pointer items-center justify-between">
		<div>
			<h2 class="text-lg font-semibold">構造化出力モード（非推奨・試験版）</h2>
			<p class="text-sm text-gray-600">AIの応答に特定のデータ構造を含めるように指示します。</p>
		</div>
		<input
			type="radio"
			name="session-mode"
			value="oneStepFC"
			checked={$apiMode === 'oneStepFC'}
			on:change={onModeChange}
		/>
	</label>

	{#if $apiMode === 'oneStepFC'}
		<div class="mt-4 space-y-4 border-t pt-4">
			<div>
				<label for="goodwill-desc" class="mb-2 block font-medium">AIへの指示 (description)</label>
				<textarea
					id="goodwill-desc"
					class="textarea w-full rounded border p-2"
					placeholder="例: キャラクターの好感度の増減を2から-2までの5段階評価"
					value={$goodwill?.descriptionForAI || ''}
					on:input={handleDescriptionChange}
				></textarea>
			</div>
			<div>
				<h3 class="mb-2 font-medium">好感度によるAIの応答変化ルール</h3>
				<div class="space-y-3">
					{#if $goodwill}
						{#each $goodwill.thresholds as threshold, i (i)}
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
