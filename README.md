# 🐱 Hirsakam Icon Generator

Hirsakamの画像に絵文字、テキスト、フリーハンド描画、オーバーレイ画像を追加してオリジナルコラ画像を生成するWebアプリケーションです。

**🎉 最新機能**:
- 🔄 **完全回転機能**: テキスト・絵文字・オーバーレイ画像すべてをマウスまたはスライダーで自由回転
- 🔀 **左右反転機能**: 絵文字・オーバーレイ画像をワンクリックで左右反転（ミラー効果）
- 📐 **レイヤー順序制御**: 要素の重ね順を自由に変更可能（ベース画像 → テキスト/絵文字/オーバーレイ → フリーハンド描画）
- 🖼️ **自動画像圧縮**: 大きな画像を自動でサイズ制限内に圧縮
- 🎯 **境界外配置**: 要素を画像フレーム外まで自由に配置可能
- ✨ **強化された描画機能**: カスタム画像でも描画が正常動作、描画内容の永続保持、描画モード時も回転状態を保持
- 🎭 **AI背景透過**: オーバーレイ画像の背景を自動除去してベース画像に自然に合成
- 📚 **ギャラリー機能**: 生成画像の一覧表示、ソート機能、ページング表示（16件/ページ）

Hirsakamとは→下の猫ちゃんです。可愛いですね。
![Image](https://github.com/user-attachments/assets/9e507d87-400b-467b-b8b6-e234c4c69135)

## 📁 ディレクトリ構造

```
hirsakam_icon_generator/
├── run.py                  # 実行スクリプト
├── hirsakam.jpg           # デフォルトのベース画像
├── output/                # 生成された画像の保存先
├── temp_uploads/          # アップロード画像の一時保存
├── backend/               # バックエンド（FastAPI）
│   ├── app.py                  # Web API サーバー
│   ├── hirsakam_icon_generator.py  # 画像生成エンジン
│   └── requirements.txt        # Python依存関係
├── frontend/              # フロントエンド（React）
│   ├── src/
│   ├── public/
│   └── package.json
└── venv/                  # Python仮想環境
```

## 🚀 起動方法

### 簡単起動（デフォルト）

```bash
python3 run.py
```

### その他のオプション

```bash
python3 run.py both      # 両方同時に起動（上と同じ）
python3 run.py backend   # バックエンドのみ
python3 run.py frontend  # フロントエンドのみ
python3 run.py help      # ヘルプ表示
```

## 🌐 アクセス先

- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:8000
- **API ドキュメント**: http://localhost:8000/docs

## ⚙️ サーバー環境での設定

### 環境変数設定

**.env ファイル設定例**:

**バックエンド** (backend/.env):
```bash
SERVER_URL=http://your-server.com
```

**フロントエンド** (frontend/.env):
```bash
# Note: React requires REACT_APP_ prefix
REACT_APP_SERVER_URL=http://your-server.com
```

### 起動コマンド例

**統合スクリプト使用（推奨）**:
```bash
# ローカル環境
python3 run.py

# サーバー環境
SERVER_URL="http://your-server" python3 run.py
```

**個別起動**:
```bash
# サーバー環境での起動（同じサーバーURLを使用）
SERVER_URL="http://your-server"

# バックエンド起動
cd backend && SERVER_URL="$SERVER_URL" python3 app.py

# フロントエンド起動（Reactには REACT_APP_ プレフィックスが必要）
cd frontend && REACT_APP_SERVER_URL="$SERVER_URL" npm start
```

## ✨ 機能

### Web UI版（推奨）
1. **絵文字追加**: Slack風の絵文字ピッカーから選択
2. **テキスト追加**: カスタムテキストと色の変更
3. **テキスト・絵文字の独立制御**: 
   - テキストと絵文字を個別に位置調整可能
   - 同時表示しながら別々に移動
   - 個別の座標入力にも対応
   - **回転機能**: スライダーまたはマウスドラッグで自由に回転
   - **左右反転機能**: 絵文字をチェックボックスでミラー反転
4. **フリーハンド描画**: 
   - マウス/タッチでの自由な線画描画
   - 色と線の太さを調整可能
   - Undo/Redo機能
   - 描画クリア機能
5. **オーバーレイ画像**: 
   - 追加画像のアップロードと合成
   - ドラッグで位置調整
   - リサイズハンドルでサイズ変更
   - **回転機能**: スライダーまたはマウスドラッグで自由に回転
   - **左右反転機能**: チェックボックスでミラー効果を適用
   - 透明度の調整
   - **背景透過機能**: AI技術による高精度な背景除去（プレビューでも確認可能）
   - **自動画像圧縮**: 800KB以上の画像を自動圧縮してアップロード
6. **レイヤー順序管理**: 
   - テキスト、絵文字、オーバーレイ画像の重ね順を自由に変更
   - ドラッグ&ドロップでの直感的なレイヤー操作
   - フリーハンド描画は常に最上位レイヤー
7. **インタラクティブプレビュー**: 
   - ドラッグで位置調整（**画像境界を超えた配置も可能**）
   - 四隅のハンドルでサイズ調整
   - 赤いハンドルでマウス回転操作（全要素対応）
   - 描画モード切り替え
8. **カスタム画像**: 独自の画像をアップロード可能
   - **自動画像圧縮**: 1MB以上の画像を自動圧縮
9. **ギャラリー**: 生成した画像の効率的な管理と表示
   - **ページング表示**: 16件ずつの見やすいページング表示
   - **ソート機能**: 新しい順・古い順で並び替え可能
   - **画像最適化**: 端が見切れない適切な画像表示
   - **一括ダウンロード**: 各画像を個別にダウンロード可能

### コマンドライン版
- 高度な絵文字処理（Twitter Twemojiから高品質画像取得）
- フォント調整とテキスト描画
- バッチ処理に適している

## 🛠️ セットアップ

### 初回セットアップ

1. **仮想環境作成**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # macOS/Linux
   # または
   venv\Scripts\activate     # Windows
   ```

2. **依存関係のインストール**
   ```bash
   pip3 install -r backend/requirements.txt
   cd frontend && npm install
   ```

### 手動起動（開発者向け）

```bash
# ターミナル1: バックエンド
python3 run.py backend

# ターミナル2: フロントエンド
python3 run.py frontend
```

### 直接実行（上級者向け）

```bash
# バックエンド
cd backend && python3 app.py

# フロントエンド
cd frontend && npm start
```

## 📝 要件

- **Python 3.10+**
- **Node.js 14+**
- **npm または yarn**
- **インターネット接続**（絵文字画像ダウンロード・AI背景透過モデルダウンロード用）
- **モダンブラウザ**（Chrome、Firefox、Safari、Edge）
  - HTML5 Canvas対応
  - JavaScript ES6+対応
  - File API対応（画像アップロード・圧縮用）

## 🎨 使い方

### Web UI版
1. `python3 run.py` でアプリケーションを起動
2. ブラウザで http://localhost:3000 にアクセス
3. **基本的な使い方**:
   - テキストまたは絵文字を入力（オプション）
   - 絵文字の場合は「左右反転」チェックボックスでミラー効果も適用可能
   - 「プレビュー」ボタンをクリック
   - ドラッグして位置を調整（**画像境界を超えて配置可能**）
   - 四隅の青いハンドルでサイズ調整
   - 上部の赤いハンドルをドラッグして回転（テキスト・絵文字・オーバーレイ画像すべて対応）
   - 回転スライダーでも角度調整可能
   - 「この位置で生成」をクリック
4. **描画機能の使い方**:
   - 「プレビュー」ボタンをクリック（テキスト・絵文字なしでもOK）
   - 「描画モードを有効にする」をチェック
   - 色と線の太さを調整
   - マウスで自由に描画
   - Undo/Redoで調整、クリアでリセット
   - 「この位置で生成」をクリック
5. **オーバーレイ画像の使い方**:
   - 「オーバーレイ画像」から画像ファイルを選択
   - **大きな画像は自動的に圧縮されます**（800KB制限）
   - プレビューで画像をドラッグして位置調整（**境界外配置可能**）
   - 四隅のハンドルでサイズ変更
   - 赤いハンドルまたはスライダーで回転調整
   - 透明度スライダーで透明度を調整
   - **「背景を透過する」チェックボックスでAI背景除去**（プレビューでも確認可能）
   - **「左右反転」チェックボックスでミラー効果**（プレビューでも確認可能）
   - 複数の画像を重ねることも可能
6. **レイヤー順序の調整**:
   - プレビュー画面右上の「レイヤー」ボタンをクリック
   - ドラッグ&ドロップでレイヤーの順序を変更
   - フリーハンド描画は常に最上位に表示
7. **カスタムベース画像**:
   - 「ベース画像をアップロード」で独自画像を使用
   - **大きな画像は自動的に圧縮されます**（1MB制限）
8. **ギャラリー機能**:
   - 生成した画像が自動的にギャラリーに保存
   - 「新しい順」「古い順」でソート可能
   - 16件ずつのページング表示で見やすく整理
   - 各画像を個別にダウンロード可能
9. 生成された画像をダウンロード

### コマンドライン版

#### 基本的な使い方
```bash
cd backend
source ../venv/bin/activate  # 仮想環境をアクティベート
```

#### 絵文字を使用
```bash
# 基本的な絵文字コラ画像を生成
python3 hirsakam_icon_generator.py --emoji 😍

# 大きな絵文字で猫の顔の中心に配置（デフォルト位置）
python3 hirsakam_icon_generator.py --emoji 😍 --emoji-size 250

# 様々な絵文字を試す（デフォルトで猫の顔の中心に配置）
python3 hirsakam_icon_generator.py --emoji 😂 --emoji-size 200
python3 hirsakam_icon_generator.py --emoji 😭 --emoji-size 220
python3 hirsakam_icon_generator.py --emoji 😎 --emoji-size 250
```

#### カスタムテキストを使用
```bash
# 任意のテキストでコラ画像を生成
python3 hirsakam_icon_generator.py --text "おはよう"

# テキストの位置を指定
python3 hirsakam_icon_generator.py --text "こんにちは" --x 100 --y 80

# フォントサイズを変更
python3 hirsakam_icon_generator.py --text "こんばんは" --size 60
```

#### その他のオプション
```bash
# 出力ファイル名を指定  
python3 hirsakam_icon_generator.py --emoji 😍 --emoji-size 164 --output my_emoji.jpg

# ベース画像を変更
python3 hirsakam_icon_generator.py --base another_image.jpg --emoji 😊
```

## 📊 よく使われる絵文字とサイズの例

| 絵文字 | 推奨コマンド | 説明 |
|-------|-------------|------|
| 😍 | `python3 hirsakam_icon_generator.py --emoji 😍 --emoji-size 250` | ハート目の猫 |
| 😂 | `python3 hirsakam_icon_generator.py --emoji 😂 --emoji-size 220` | 大笑いの猫 |
| 😭 | `python3 hirsakam_icon_generator.py --emoji 😭 --emoji-size 230` | 大泣きの猫 |
| 😎 | `python3 hirsakam_icon_generator.py --emoji 😎 --emoji-size 250` | クールな猫 |
| 😴 | `python3 hirsakam_icon_generator.py --emoji 😴 --emoji-size 200` | 眠い猫 |
| 🤔 | `python3 hirsakam_icon_generator.py --emoji 🤔 --emoji-size 220` | 考える猫 |
| 😏 | `python3 hirsakam_icon_generator.py --emoji 😏 --emoji-size 240` | ニヤリとする猫 |

## 🔧 コマンドライン引数

| 引数 | 説明 | デフォルト値 |
|------|------|-------------|
| `--base` | ベース画像のパス | `hirsakam.jpg` |
| `--emoji` | 絵文字（例: 😍） | - |
| `--text` | カスタムテキスト | - |
| `--output` | 出力ファイル名 | 自動生成 |
| `--x` | X座標 | 190 (猫の顔の中心) |
| `--y` | Y座標 | 115 (猫の顔の中心) |
| `--size` | フォントサイズ | 48 |
| `--emoji-size` | 絵文字のサイズ（ピクセル） | 250 |

## 📁 出力

生成された画像は `output/` ディレクトリに保存されます。

- **絵文字使用時**: `output/image_emoji_{unicodeコード}.jpg`
- **カスタムテキスト使用時**: `output/image_custom.jpg`
- **`--output` 指定時**: 指定されたパス

## 💡 ファイル構成の説明

### `app.py` vs `hirsakam_icon_generator.py`

- **`hirsakam_icon_generator.py`**: 画像生成の核となるエンジン
  - Pillowを使った画像処理
  - 絵文字・テキストの描画
  - 描画オーバーレイの合成
  - コマンドライン単体実行可能
  
- **`app.py`**: Web API サーバー
  - FastAPIを使ったWebサーバー
  - HTTP エンドポイント提供
  - 描画データの受信・処理
  - `hirsakam_icon_generator.py`を利用

## 🛠️ トラブルシューティング

### 画像ファイルサイズエラー
**問題**: "Part exceeded maximum size of 1024KB" エラー  
**解決**: 自動画像圧縮機能で解決済み
- オーバーレイ画像: 800KB以上で自動圧縮
- ベース画像: 1MB以上で自動圧縮
- 画質を維持しながらファイルサイズを削減

### 絵文字が表示されない
```bash
# ネットワーク接続を確認
ping raw.githubusercontent.com

# requestsライブラリを再インストール
pip3 install --upgrade requests
```

### フォントが表示されない・テキストがおかしい
**症状**: プレビューは正常だが、生成画像でテキストの表示がおかしい

**原因**: サーバー環境にフォントがインストールされていない

**解決方法**:

**Rocky Linux / CentOS / RHEL の場合**:
```bash
# 基本フォントパッケージをインストール
sudo dnf install dejavu-sans-fonts liberation-fonts

# 日本語フォント（推奨）
sudo dnf install google-noto-sans-cjk-fonts google-noto-fonts-common

# または epel リポジトリから
sudo dnf install epel-release
sudo dnf install google-noto-sans-cjk-ttc-fonts
```

**Ubuntu / Debian の場合**:
```bash
# 基本フォント
sudo apt-get install fonts-dejavu fonts-liberation

# 日本語フォント
sudo apt-get install fonts-noto-cjk
```

**フォント診断**:
```bash
# 日本語フォントの確認（重要）
fc-list | grep -i "noto.*cjk\|takao\|ipa"

# 全フォントの確認
fc-list | grep -i "dejavu\|liberation\|noto"

# フォントディレクトリの確認
ls -la /usr/share/fonts/

# 日本語フォントファイルの直接確認
find /usr/share/fonts -name "*CJK*" -o -name "*Takao*" -o -name "*IPA*"
```

**自動日本語フォント検出機能**:
- システムは日本語文字を自動検出し、CJKフォントを優先使用
- Rocky LinuxでDejaVu/Liberationフォントが選択される問題を解決
- 動的フォント検索も日本語フォント優先に変更

**重要**: 日本語テキストを使用する場合は必ずCJK（中日韓）フォントをインストールしてください。

### 画像の回転がうまくいかない
- マウスドラッグ回転: 要素の中心を基準に赤いハンドルをドラッグ（テキスト・絵文字・オーバーレイ画像すべて対応）
- スライダー回転: より正確な角度調整が可能
- 複数要素が重なっている場合は、目的の要素をクリックして選択
- 描画モード中は回転状態が固定表示され、生成時も回転が保持されます

### フリーハンド描画が表示されない・消える
**解決済み**: カスタム画像での描画問題を修正
- カスタム画像アップロード後もフリーハンド描画が正常に動作
- 時間が経過しても描画内容が保持される
- キャンバス初期化時の描画保存・復元機能を改善

### 描画モード移行時の要素位置ズレ
**解決済み**: 描画モード時の座標計算を修正
- テキストと絵文字の位置が描画モード切り替え時にズレない
- 通常表示と描画モード固定表示で同一のレイアウト計算を使用
- 透明ボーダーでレイアウト構造を統一

### 仮想環境のエラー
```bash
# 仮想環境を再作成
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip3 install -r backend/requirements.txt
```

### 権限エラー
```bash
# ファイルの作成権限を確認
chmod +w output/
```

### ポートが使用中エラー
```bash
# ポートを使用しているプロセスを確認
lsof -i :3000  # フロントエンド
lsof -i :8000  # バックエンド

# プロセスを終了（PIDを確認してから）
kill -9 <PID>
```

## 🎨 カスタマイズ

### 猫の顔の中心位置の調整
`backend/hirsakam_icon_generator.py` の `face_center` 変数を編集：

```python
# 猫の顔の中心位置（画像を精密に測定）
self.face_center = (190, 115)
```

### 絵文字のデフォルト位置の変更
`generate_with_emoji` メソッドのデフォルト値を変更：

```python
def generate_with_emoji(self, emoji_char, position=(330, 180), size=250, output_path=None):
```

## 📄 ライセンス

このプロジェクトはオープンソースです。画像の使用については適切な権利を確認してください。

- **絵文字画像**: Twitter Twemoji (CC BY 4.0)
- **ベース画像**: 適切な権利を確認してください
