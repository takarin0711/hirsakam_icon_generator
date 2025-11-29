# Slack API Migration Guide

## 概要

Slackの`files.upload` APIが2025年11月12日に廃止されるため、新しい`files_upload_v2`メソッドに移行しました。

## 変更内容

### 1. 使用ライブラリの変更

**旧方式:**
- curlコマンドで直接`files.upload` APIを呼び出し
- Webhook URLを使用

**新方式:**
- `slack-sdk` (Python公式ライブラリ) を使用
- `files_upload_v2()` メソッドで自動的に2ステップ処理を実行
  1. `files.getUploadURLExternal` - アップロードURLを取得
  2. `files.completeUploadExternal` - アップロード完了を通知

### 2. 認証方式の変更

**旧方式:**
- `SLACK_WEBHOOK_URL` 環境変数
- Webhook URL形式: `https://your-workspace.slack.com/api/files.upload`

**新方式:**
- `SLACK_BOT_TOKEN` 環境変数
- Bot User OAuth Token形式: `xoxb-***-***-***`

## セットアップ手順

### 1. Slack Appの設定

1. [Slack API Apps](https://api.slack.com/apps) にアクセス
2. 既存のアプリを選択、または新規作成
3. **OAuth & Permissions** ページに移動
4. **Bot Token Scopes** に以下を追加:
   - `files:write` - ファイルアップロード権限
   - `chat:write` - メッセージ送信権限
5. **Install to Workspace** でワークスペースにインストール
6. **Bot User OAuth Token** (xoxb-で始まる) をコピー

### 2. 環境変数の設定

`env/.env` ファイルを編集:

```bash
# 旧設定（削除または無効化）
# SLACK_WEBHOOK_URL=https://your-workspace.slack.com/api/files.upload

# 新設定
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_DEFAULT_CHANNEL=#tmp-hirsakam-icon-generator
```

### 3. 依存関係のインストール

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

`slack-sdk>=3.27.0` が自動的にインストールされます。

### 4. サーバーの再起動

```bash
python3 run.py
```

## テスト方法

1. アプリケーションを起動
2. ガチャを実行
3. **Slackに共有** ボタンをクリック
4. チャンネル名とメッセージを入力
5. 送信が成功することを確認

## トラブルシューティング

### エラー: "Slack Bot Tokenが設定されていません"

**原因:** 環境変数が設定されていない

**解決策:**
1. `env/.env` ファイルで`SLACK_BOT_TOKEN`を設定
2. サーバーを再起動

### エラー: "missing_scope"

**原因:** 必要な権限がBotに付与されていない

**解決策:**
1. Slack App管理画面で`files:write`と`chat:write`スコープを追加
2. アプリを再インストール
3. 新しいBot Tokenを取得して設定

### エラー: "channel_not_found"

**原因:** Botがチャンネルに参加していない、またはチャンネル名が間違っている

**解決策:**
1. Slackでチャンネルを開く
2. `/invite @your-bot-name` でBotを招待
3. チャンネル名が正しいか確認 (例: `#general`)

### エラー: "not_in_channel"

**原因:** Botがチャンネルのメンバーではない

**解決策:**
- Slackでチャンネルに `/invite @your-bot-name` を実行

## 技術的な詳細

### コード変更箇所

#### backend/app.py

**関数:** `share_to_slack()` (line 745)
- curlコマンドから`slack-sdk`の`WebClient`に変更
- `files_upload_v2()`メソッドを使用

**関数:** `share_generated_image_to_slack()` (line 815)
- curlコマンドから`slack-sdk`の`WebClient`に変更
- `files_upload_v2()`メソッドを使用

#### backend/requirements.txt

追加:
```
slack-sdk>=3.27.0
```

#### env/.env

変更:
```bash
# 旧: SLACK_WEBHOOK_URL
# 新: SLACK_BOT_TOKEN
```

## 参考リンク

- [Slack API Changelog - Better File Uploads](https://docs.slack.dev/changelog/2024-04-a-better-way-to-upload-files-is-here-to-stay/)
- [Slack SDK for Python - files_upload_v2](https://slack.dev/python-slack-sdk/api-docs/slack_sdk/web/client.html#slack_sdk.web.client.WebClient.files_upload_v2)
- [Slack API - OAuth Scopes](https://api.slack.com/scopes)

## 重要な日付

- **2024年5月16日:** 新規アプリは`files.upload`を使用不可
- **2025年11月12日:** 既存アプリも含め`files.upload`完全廃止

**アクションが必要:** 2025年11月12日までに移行を完了してください。
