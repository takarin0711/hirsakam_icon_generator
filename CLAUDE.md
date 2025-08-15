# Claude Code設定ファイル

## プロジェクト概要
Hirsakam Icon Generator - 猫の画像にテキスト、絵文字、描画、複数オーバーレイ画像を追加するWebアプリケーション。ガチャ機能、Slack連携、高度なレイヤー管理機能を搭載。

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
- **オーバーレイ問題**: コンソールで"Overlay images data received"ログを確認
- **レイヤー順序**: バックエンドログで"Layer order"を確認

## 最新機能

### ✅ コア機能
- **複数オーバーレイ画像**: 3つの独立スロットで複数のオーバーレイ画像を管理
- **レイヤー管理**: ドラッグ&ドロップで直感的な重ね順変更
- **トリミング機能**: ベース画像のリアルタイムトリミング
- **フリーハンド描画**: HTML5 Canvasでの自由描画

### ✅ エンターテイメント
- **ガチャ機能**: 4段階レアリティ(N/R/SR/SSR)、1回&10連ガチャ
- **Slack連携**: ガチャ結果、生成画像のSlack共有

### ✅ 技術的改善
- **画像品質改善**: dom-to-imageライブラリ採用で高品質スクリーンショット
- **環境変数統一**: env/.envファイルで設定一元管理
- **自動画像圧縮**: アップロード時の自動リサイズ&品質最適化

## 機能詳細

### オーバーレイ画像機能
- **3スロット管理**: 独立した3つのオーバーレイスロット
- **個別制御**: 位置、サイズ、透明度、回転角をスロット毎に設定
- **背景除去**: rembgライブラリで自動背景除去
- **水平反転**: ワンクリックで水平反転効果

### レイヤー管理機能
- **重ね順変更**: ドラッグ&ドロップで直感的な順序変更
- **レイヤー構成**: ベース画像 → テキスト/絵文字/オーバーレイ → フリーハンド描画
- **リアルタイムプレビュー**: 変更が即座に反映

### ガチャシステム
- **レアリティ設定**: N(50%) → R(30%) → SR(17%) → SSR(3%)
- **10連ガチャ**: 最後1枚SR以上確定
- **Slack連携**: ガチャ結果をスクリーンショットで共有

## 注意事項
- Python 3.10+ 必須
- Node.js 14+ 必須
- 日本語フォント必要（CJKフォント推奨）
- **画像アップロード制限**: ベース画像1MB、オーバーレイ800KB（自動圧縮）
- **ブラウザ対応**: Chrome/Firefox/Safari最新版推奨

## 開発者向け情報

### アーキテクチャ
- **フロントエンド**: React HooksベースのシングルファイルSPA
- **状態管理**: useStateでローカル状態管理、Reduxなし
- **キャンバス**: HTML5 Canvas + Fabric.jsで描画機能
- **バックエンド**: FastAPI + Pillowで画像処理

### 重要な実装ポイント
- **オーバーレイスロット**: `overlaySlot1/2/3`で独立管理、`slotNumber`でバックエンド連携
- **レイヤー順序**: `layerOrder`配列でフロントエンドからバックエンドに送信
- **画像スケーリング**: `imageScale`でプレビューと生成時の座標変換
- **base64传送**: オーバーレイ画像はbase64エンコードでバックエンドに送信