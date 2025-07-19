# Claude Code設定ファイル

## プロジェクト概要
Hirsakam Icon Generator - 猫の画像にテキスト、絵文字、描画、オーバーレイを追加するWebアプリケーション。ガチャ機能とSlack連携も搭載。

## 技術スタック
- **フロントエンド**: React, HTML5 Canvas, dom-to-image
- **バックエンド**: FastAPI (Python), Pillow, rembg
- **依存関係**: Node.js, Python 3.10+

## ディレクトリ構造
```
hirsakam_icon_generator/
├── frontend/          # React アプリケーション
├── backend/           # FastAPI サーバー
├── env/               # 環境変数設定
├── output/            # 生成画像
├── hirsakam_gacha_image/ # ガチャ素材
└── run.py             # 統合起動スクリプト
```

## よく使うコマンド

### 開発サーバー起動
```bash
# 統合起動（推奨）
python3 run.py

# 個別起動
python3 run.py backend    # バックエンドのみ
python3 run.py frontend   # フロントエンドのみ
```

### 依存関係のインストール
```bash
# バックエンド
cd backend && source venv/bin/activate && pip install -r requirements.txt

# フロントエンド
cd frontend && npm install
```

### テスト・デバッグ
```bash
# バックエンドAPI確認
curl http://localhost:8000/

# フロントエンド確認
open http://localhost:3000
```

### デプロイ・ビルド
```bash
# フロントエンドビルド
cd frontend && npm run build

# 環境変数設定（本番環境）
# env/.env ファイルを編集してSERVER_URLを設定
```

## 環境変数設定
主要な設定は `env/.env` ファイルで管理：

```bash
# サーバーURL（本番環境で設定）
SERVER_URL=http://your-server.com

# Slack連携（オプション）
SLACK_WEBHOOK_URL=https://your-workspace.slack.com/api/files.upload
SLACK_DEFAULT_CHANNEL=#tmp-hirsakam-icon-generator
SLACK_BOT_ICON_URL=https://your-icon-url.png
```

## 重要なファイル

### フロントエンド
- `frontend/src/App.js` - メインアプリケーション
- `frontend/src/App.css` - スタイル定義
- `frontend/package.json` - Node.js依存関係

### バックエンド
- `backend/app.py` - FastAPI Web API
- `backend/hirsakam_icon_generator.py` - 画像生成エンジン
- `backend/requirements.txt` - Python依存関係

### 設定・データ
- `env/.env` - 環境変数設定
- `hirsakam_gacha_image/` - ガチャ画像素材
- `output/` - 生成画像保存先

## トラブルシューティング

### よくある問題
1. **ポート競合**: `lsof -i :3000` または `lsof -i :8000` でプロセス確認
2. **依存関係エラー**: 仮想環境を再作成 `rm -rf backend/venv && python3 -m venv backend/venv`
3. **Slack送信エラー**: `env/.env` ファイルのSLACK_WEBHOOK_URL設定を確認
4. **スクリーンショット品質**: dom-to-imageライブラリ使用、html2canvasから変更済み

### デバッグ方法
- ブラウザのDevToolsコンソールでフロントエンドエラー確認
- バックエンドはターミナルでログ確認
- API動作は `http://localhost:8000/docs` でSwagger UI確認

## 最新機能
- ✅ Slackガチャ結果共有機能（dom-to-imageスクリーンショット）
- ✅ 環境変数統一（env/.env）
- ✅ 画像品質改善（薄い問題解決）
- ✅ ガチャ機能（4段階レアリティ、10連ガチャ）
- ✅ トリミング機能
- ✅ レイヤー管理機能

## 注意事項
- Python 3.10+ 必須
- Node.js 14+ 必須
- 日本語フォント必要（CJKフォント推奨）
- 画像アップロード制限: ベース画像1MB、オーバーレイ800KB（自動圧縮）