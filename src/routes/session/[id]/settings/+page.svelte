<!-- src/routes/session/[id]/settings/+page.svelte -->

<script lang="ts">
	/**
	 * @file このファイルは、特定のセッション（:idで指定）に関する設定ページを定義します。
	 */
	import { page } from '$app/stores';
	import { sessions } from '$lib/stores';
	import { derived } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';

	// 各モードの設定コンポーネントをインポート
	import StandardMode from '$lib/components/settings/StandardMode.svelte';
	import GameModeSettings from '$lib/components/settings/GameModeSettings.svelte';
	import StructuredOutputSettings from '$lib/components/settings/StructuredOutputSettings.svelte';
	import FunctionCallingSettings from '$lib/components/settings/FunctionCallingSettings.svelte';
	import StatusSettings from '$lib/components/settings/StatusSettings.svelte';
	import TriggerSettings from '$lib/components/settings/TriggerSettings.svelte';
	import ImportExportSettings from '$lib/components/settings/ImportExportSettings.svelte';
	import DiceRollSettings from '$lib/components/settings/DiceRollSettings.svelte';

	const sessionId = derived(page, ($page) => $page.params.id);
	const currentSession = derived([sessions, sessionId], ([$sessions, $sessionId]) =>
		$sessions.find((s) => s.id === $sessionId)
	);

	onMount(() => {
		if (!$sessions.some((s) => s.id === $page.params.id)) {
			goto(base || '/');
			return;
		}

		// データマイグレーション処理
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate) {
				// 1. 各種プロパティの初期化
				if (typeof sessionToUpdate.viewMode === 'undefined') {
					sessionToUpdate.viewMode = 'standard';
				}
				if (typeof sessionToUpdate.customStatuses === 'undefined') {
					sessionToUpdate.customStatuses = [];
				}
				if (typeof sessionToUpdate.triggers === 'undefined') {
					sessionToUpdate.triggers = [];
				} else {
					// 既存の各トリガーにプロパティが存在するかチェックし、なければ初期化
					sessionToUpdate.triggers.forEach((trigger) => {
						if (!trigger.conditions) {
							trigger.conditions = [
								{ id: crypto.randomUUID(), statusId: '', operator: '>=', value: 0 }
							];
						}
						if (!trigger.conjunctions) {
							trigger.conjunctions = [];
						}
						if (typeof trigger.hasBeenExecuted === 'undefined') {
							trigger.hasBeenExecuted = false;
						}
						if (typeof trigger.lastEvaluationResult === 'undefined') {
							trigger.lastEvaluationResult = false;
						}
					});
				}
				// 2. gameViewSettings の初期化と、古い status データの移行
				if (typeof sessionToUpdate.gameViewSettings === 'undefined') {
					sessionToUpdate.gameViewSettings = {
						imageBaseUrl: 'https://dashing-fenglisu-4c8446.netlify.app',
						imageExtension: '.avif'
					};
				} else {
					// 過去のバージョンで gameViewSettings に statuses があった場合の移行処理
					const oldSettings = sessionToUpdate.gameViewSettings as any;
					if (oldSettings.customStatuses) {
						sessionToUpdate.customStatuses.push(...oldSettings.customStatuses);
						delete oldSettings.customStatuses;
					}
					// 過去の showDate/showFavorability は移行対象外とし、削除
					delete oldSettings.showDate;
					delete oldSettings.showFavorability;
				}

				// 3. 全ステータスの整合性チェック (デフォルト値の設定)
				sessionToUpdate.customStatuses.forEach((status) => {
					if (typeof status.isVisible === 'undefined') {
						status.isVisible = true;
					}
					if (typeof status.mode === 'undefined') {
						status.mode = 'set';
					}
				});
				if (typeof sessionToUpdate.hideFirstUserMessage === 'undefined') {
					sessionToUpdate.hideFirstUserMessage = false;
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
	function toggleHideFirstUserMessage(event: Event) {
		const isChecked = (event.target as HTMLInputElement).checked;
		sessions.update((allSessions) => {
			const sessionToUpdate = allSessions.find((s) => s.id === $page.params.id);
			if (sessionToUpdate) {
				sessionToUpdate.hideFirstUserMessage = isChecked;
				sessionToUpdate.lastUpdatedAt = new Date().toISOString();
			}
			return allSessions;
		});
	}
</script>

<div class="flex h-screen flex-col p-4">
	<!-- ヘッダー部分 -->
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-xl font-bold">セッション設定</h1>
		<a
			href="{base}/session/{$sessionId}"
			class="rounded bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300"
		>
			セッションに戻る
		</a>
	</div>

	{#if $currentSession}
		<div class="space-y-6">
			<label class="block cursor-pointer rounded-lg border border-gray-200 p-4">
				<div class="space-y-2">
					<div class="flex items-center space-x-2">
						<input
							type="checkbox"
							class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
							checked={$currentSession.hideFirstUserMessage || false}
							on:change={toggleHideFirstUserMessage}
						/>
						<span class="text-lg font-semibold"> 最初のユーザーメッセージを隠す </span>
					</div>
					<p class="text-sm text-gray-600">
						会話のきっかけとなる最初の入力をチャット画面に表示しないようにします。
					</p>
				</div>
			</label>
			<ImportExportSettings />
			<!-- モード選択 -->
			<StandardMode {currentSession} onModeChange={handleSessionModeChange} />
			<GameModeSettings {currentSession} onModeChange={handleSessionModeChange} />
			<StructuredOutputSettings {currentSession} onModeChange={handleSessionModeChange} />
			<FunctionCallingSettings {currentSession} onModeChange={handleSessionModeChange} />

			<!-- 汎用設定 -->
			<DiceRollSettings />
			<StatusSettings />
			<TriggerSettings />
		</div>
	{:else}
		<p>セッション情報を読み込んでいます...</p>
	{/if}
</div>
