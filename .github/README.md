# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

「一枚絵」機能の要件定義

1. 基本原則：独立した最前面レイヤー
   「一枚絵」は、既存の「背景」と「人物」とは完全に独立した、常に最前面に表示される画像レイヤーです。
   画面の重なり順は、[奥] 背景 → 人物 → 一枚絵 [手前] となります。
   「一枚絵」の表示・非表示は、「背景」「人物」の表示状態に一切影響を与えず、また影響も受けません。
2. 表示・変更に関するルール
   これらのルールは、主に同一のAI応答メッセージ内での挙動を定義します。
   ルールA：表示の開始
   AIの応答メッセージ内に {{一枚絵: 値}} というコマンドが含まれるページに到達した瞬間に、指定された一枚絵が表示されます。
   ルールB：表示の継続
   一度表示された一枚絵は、後述の「非表示ルール」が適用されるまで、同一応答内の後続ページで画像指定がなくても表示され続けます。
   例えば、3ページ目で一枚絵が表示された後、5ページ目で背景・人物が変更されても、一枚絵は表示されたままです。画面は「新しい背景・人物」の上に「既存の一枚絵」が重なった状態になります。
   ルールC：一枚絵の上書き
   ある一枚絵が表示されている状態で、後続のページで別の {{一枚絵: ...}} コマンドが現れた場合、古い一枚絵は非表示になり、新しい一枚絵に差し替わります。
3. 非表示に関するルール（最重要）
   このルールは、主にAIとの応答が切り替わる際の挙動を定義します。
   ルールD：新しい応答によるリセット判定
   前提: 以前の応答によって、一枚絵が表示されている状態。
   トリガー: ユーザーがメッセージを送信し、AIから新しい応答が返ってくる。
   判定タイミング: ユーザーが新しい応答のページをめくっていき、最初に出会う画像指定コマンド（背景, 人物, 一枚絵のいずれか）が処理される瞬間。
   条件とアクション:
   もし、その「最初の画像指定コマンド」が 背景 または 人物 であった場合
   → その瞬間に、表示され続けていた古い一枚絵は非表示になります。
   もし、その「最初の画像指定コマンド」が 一枚絵 であった場合
   → ルールCに基づき、古い一枚絵は新しい一枚絵に**上書き（差し替え）**されます。
   もし、新しい応答メッセージ内に画像指定コマンドが一つも存在しない場合
   → 古い一枚絵は表示されたままとなります。

機能

アップロード、自身のセッション履歴をアップロードできる。セッションすべてのアップロードもしくは世界観のみでセッション設定初回のユーザーとAIの応答。

ダウンロード、アップロードされているセッションを読み込む。他のセッションを参考にしたり、世界観のみでセッション設定と初回のユーザーとAIの応答から自分で物語の続きを作成できる。

アプリ設定
429エラーのときに複数APIがあればループ

指数関数バックオフ機能

AI応答のURLを自動修正

トークン数が多くなったら要約

生成パラメーター

Googleアカウントと連携

自身のGoogleDriveと連携して自動保存

セッション設定
セッション設定のJSON化、セッション設定をコピーできるようにする。難読化も可。

ダイスロール、指示文とダイス数とダイス目を指定してランダムな数をユーザーの送信とともに常時送る。

ステータス設定、{{ステータス:数値}}このような文字をAIの応答にあれば数値を加算、上書きできる。AIが意図しない数を出力したときに上限下限も設定可。（ユーザープロンプトにて出力指示）

トリガー設定、ステータス情報をもとに閾値を設定してユーザーの送信とともに指示文を追加して送る。

チャット画面
チャットバブル機能、再送信、編集、削除、コピー、送受信のメタデータ機能

サーバーテーブル
CREATE TABLE files (
-- 基本情報
id VARCHAR(255) PRIMARY KEY, -- ファイルの一意なID (UUIDなど)
title VARCHAR(255) NOT NULL, -- 表示用のファイルタイトル
description TEXT, -- ファイルの内容に関する説明文
imageUrl TEXT, -- 表示用の画像URL

    -- ファイル実体に関する情報 (Vercel Blob)
    fileName VARCHAR(255) NOT NULL, -- 元のファイル名
    blobUrl TEXT NOT NULL, -- Vercel Blob上のファイルの公開URL
    pathname TEXT NOT NULL, -- Vercel Blob上のパス名 (削除時に使用)
    contentType VARCHAR(255), -- application/json など
    size INTEGER NOT NULL, -- ファイルサイズ (バイト)
    checksum VARCHAR(255), -- ファイルのハッシュ値 (SHA-256など)

    -- タイムスタンプとバージョン
    uploadedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- アップロード日時
    updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- 最終更新日時
    expiresAt TIMESTAMP WITH TIME ZONE, -- ファイルの有効期限

    -- ユーザーと権限
    uploaderId VARCHAR(255) NOT NULL, -- 【重要】 アップロードしたユーザーのID
    visibility VARCHAR(50) DEFAULT 'public', -- public (公開), private (非公開)

    -- 集計・メタ情報
    downloadCount INTEGER DEFAULT 0, -- ダウンロード回数
    starCount INTEGER DEFAULT 0, -- 「お気に入り」や「スター」が付けられた回数
    commentCount INTEGER DEFAULT 0, -- ファイルに付けられたコメントの数
    tags TEXT[], -- 検索用のタグ配列 (例: {"api", "v2"})
    version INTEGER DEFAULT 1 -- バージョン番号 (デフォルト: 1)

);
