# Hirsakam コラ画像ジェネレーター

hirsakam.jpgをベースにしたコラ画像を簡単に作成できるPythonツールです。

## 特徴

- **動的絵文字機能**: Web上から絵文字画像を取得し、任意のサイズで猫の顔に重ねることが可能
- **カスタムテキスト**: 任意のテキストでコラ画像を作成
- **フォント調整**: テキストサイズ、位置、色のカスタマイズ
- **縁取り文字**: 読みやすい黒縁文字を自動追加
- **高品質絵文字**: Twitter Twemojiを使用した高解像度絵文字表示

## インストール

### 1. リポジトリをクローン
```bash
git clone <repository-url>
cd hirsakam_icon
```

### 2. 仮想環境のセットアップ
```bash
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# または
venv\Scripts\activate     # Windows
```

### 3. 依存関係のインストール
```bash
pip install Pillow requests emoji
```

## 使用方法

### 基本的な使い方

仮想環境をアクティベートしてから実行してください：
```bash
source venv/bin/activate
```

### 絵文字を使用
```bash
# 基本的な絵文字コラ画像を生成
python hirsakam_icon_generator.py --emoji 😍

# 大きな絵文字で猫の顔の輪郭に合わせる
python hirsakam_icon_generator.py --emoji 😍 --emoji-size 250 --x 330 --y 180

# 様々な絵文字を試す
python hirsakam_icon_generator.py --emoji 😂 --emoji-size 200 --x 320 --y 170
python hirsakam_icon_generator.py --emoji 😭 --emoji-size 220 --x 325 --y 175
python hirsakam_icon_generator.py --emoji 😎 --emoji-size 250 --x 330 --y 180
python hirsakam_icon_generator.py --emoji 😴 --emoji-size 200 --x 315 --y 165
```

### カスタムテキストを使用
```bash
# 任意のテキストでコラ画像を生成
python hirsakam_icon_generator.py --text "おはよう"

# テキストの位置を指定
python hirsakam_icon_generator.py --text "こんにちは" --x 100 --y 80

# フォントサイズを変更
python hirsakam_icon_generator.py --text "こんばんは" --size 60
```

### その他のオプション
```bash
# 出力ファイル名を指定
python hirsakam_icon_generator.py --emoji 😍 --output my_emoji.jpg

# ベース画像を変更
python hirsakam_icon_generator.py --base another_image.jpg --emoji 😊
```

## よく使われる絵文字とサイズの例

| 絵文字 | 推奨コマンド | 説明 |
|-------|-------------|------|
| 😍 | `python hirsakam_icon_generator.py --emoji 😍 --emoji-size 250 --x 330 --y 180` | ハート目の猫 |
| 😂 | `python hirsakam_icon_generator.py --emoji 😂 --emoji-size 220 --x 325 --y 175` | 大笑いの猫 |
| 😭 | `python hirsakam_icon_generator.py --emoji 😭 --emoji-size 230 --x 325 --y 175` | 大泣きの猫 |
| 😎 | `python hirsakam_icon_generator.py --emoji 😎 --emoji-size 250 --x 330 --y 180` | クールな猫 |
| 😴 | `python hirsakam_icon_generator.py --emoji 😴 --emoji-size 200 --x 315 --y 165` | 眠い猫 |
| 🤔 | `python hirsakam_icon_generator.py --emoji 🤔 --emoji-size 220 --x 320 --y 170` | 考える猫 |
| 😏 | `python hirsakam_icon_generator.py --emoji 😏 --emoji-size 240 --x 325 --y 175` | ニヤリとする猫 |

## コマンドライン引数

| 引数 | 説明 | デフォルト値 |
|------|------|-------------|
| `--base` | ベース画像のパス | `hirsakam.jpg` |
| `--emoji` | 絵文字（例: 😍） | - |
| `--text` | カスタムテキスト | - |
| `--output` | 出力ファイル名 | 自動生成 |
| `--x` | X座標 | 50 (テキスト), 300 (絵文字) |
| `--y` | Y座標 | 50 (テキスト), 155 (絵文字) |
| `--size` | フォントサイズ | 48 |
| `--emoji-size` | 絵文字のサイズ（ピクセル） | 150 |

## 出力

生成された画像は `output/` ディレクトリに保存されます。

- 絵文字使用時: `output/hirsakam_emoji_{unicodeコード}.jpg`
- カスタムテキスト使用時: `output/hirsakam_custom.jpg`
- `--output` 指定時: 指定されたパス

## ファイル構成

```
hirsakam_icon/
├── hirsakam.jpg                  # ベース画像
├── hirsakam_icon_generator.py    # メインプログラム
├── venv/                         # 仮想環境
├── output/                       # 生成画像の出力先
├── README.md                     # このファイル
└── 既存のコラ画像...
```

## 技術的な特徴

### 絵文字の動的取得
- Twitter Twemojiから高品質な絵文字画像をダウンロード
- 任意のサイズに拡大・縮小可能（フォントサイズの制限なし）
- 透明背景でクリーンな合成

### 位置調整のコツ
- 猫の顔の中心付近: `--x 300 --y 155`
- 猫の鼻あたり: `--x 330 --y 180`
- 大きな絵文字（200px以上）の場合は、やや右下にずらすと自然

## 動作環境

- Python 3.7以上
- Pillow (PIL) ライブラリ
- requests ライブラリ
- emoji ライブラリ
- インターネット接続（絵文字画像のダウンロード用）

## トラブルシューティング

### 絵文字が表示されない
```bash
# ネットワーク接続を確認
ping raw.githubusercontent.com

# requestsライブラリを再インストール
pip install --upgrade requests
```

### フォントが表示されない
macOS以外の環境では、システムフォントのパスが異なる場合があります。その場合はデフォルトフォントが使用されます。

### 仮想環境のエラー
```bash
# 仮想環境を再作成
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install Pillow requests emoji
```

### 権限エラー
ファイルの作成権限を確認してください：
```bash
chmod +w output/
```

## カスタマイズ

### 猫の顔の中心位置の調整
`hirsakam_icon_generator.py` の `face_center` 変数を編集することで、異なる画像に対応できます：

```python
# 猫の顔の中心位置（画像を精密に測定）
self.face_center = (190, 115)
```

### 絵文字のデフォルト位置の変更
`generate_with_emoji` メソッドのデフォルト値を変更：

```python
def generate_with_emoji(self, emoji_char, position=(330, 180), size=250, output_path=None):
```

## ライセンス

このプロジェクトはオープンソースです。画像の使用については適切な権利を確認してください。

- 絵文字画像: Twitter Twemoji (CC BY 4.0)
- ベース画像: 適切な権利を確認してください