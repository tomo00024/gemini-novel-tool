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
id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
title VARCHAR(150) NOT NULL,
description TEXT,
image_url TEXT,
author_name VARCHAR(100) NOT NULL,

    -- ファイル実体に関する情報 (Vercel Blob)
    file_name VARCHAR(255) NOT NULL,
    blob_url TEXT NOT NULL UNIQUE,
    pathname TEXT NOT NULL UNIQUE,
    content_type VARCHAR(100),
    size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
    checksum VARCHAR(64),

    -- タイムスタンプとバージョン
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    version INTEGER DEFAULT 1 NOT NULL,

    -- ユーザーと権限
    uploader_id TYPE TEXT;
    visibility VARCHAR(20) DEFAULT 'public' NOT NULL
               CHECK (visibility IN ('public', 'private', 'unlisted')),

    -- 集計・メタ情報
    download_count INTEGER DEFAULT 0 NOT NULL,
    star_count INTEGER DEFAULT 0 NOT NULL,
    comment_count INTEGER DEFAULT 0 NOT NULL,
    tags TEXT[]

);

-- トリガー関数: updated_atを自動更新
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = NOW();
RETURN NEW;
END;

$$
LANGUAGE plpgsql;

-- トリガーの作成
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON files
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();


-- --- パフォーマンス向上のためのインデックス ---

-- 1. 自分の投稿履歴を高速に表示するため
CREATE INDEX idx_files_uploader_id ON files (uploader_id);

-- 2. 公開ファイル一覧を最新順で高速に表示するため
CREATE INDEX idx_files_visibility_uploaded_at ON files (visibility, uploaded_at DESC);

-- 3. タグによる検索を高速化するため
CREATE INDEX idx_files_tags ON files USING GIN (tags);

-- 4. 人気順（ダウンロード数順）で高速に表示するため (今回追加)
CREATE INDEX idx_files_download_count ON files (download_count DESC);

JSONをわかりやすく
提供された情報を以下のように整理しました。

### 基本情報

- **ID:** 87c1a24d-c879-4029-b3f1-55982fe38979
- **タイトル:** ｗてｗてｔｗｔｗ
- **作成日時:** 2025年11月17日 12:25:14
- **最終更新日時:** 2025年11月17日 12:40:30

### 対話ログ

- **ユーザーの発言 (2025/11/17 12:25:18):**
  ｗてｗてｔｗｔｗ
- **AIの応答 (2025/11/17 12:25:19):**
  この文章は、意味のある単語や文法的な構造を持たない、ランダムな文字の羅列のように見えます。

  もし、何か意図があってこの文字を並べられたのであれば、どのような意図だったのか教えていただけますでしょうか？例えば、
  - **特定の意味を持たせたかった**（隠語、暗号など）
  - **単にキーボードを叩いただけ**
  - **他の文章の一部だった**

  など、何かヒントがあれば、より的確な回答ができるかもしれません。

### 各種設定

#### カスタムステータス

- **ステータス名:** てて
- **現在の値:** 0

#### トリガー

- **条件:** 「てて」のステータスが0以上の場合に1度だけ実行
- **実行内容:** うぇてｗｔを語尾につけること

### インポート情報

- **作成者:** ｗｗ
- **インポート日時:** 2025年11月17日 12:40:30
$$
