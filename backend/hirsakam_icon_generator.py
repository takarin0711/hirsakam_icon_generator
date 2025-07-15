#!/usr/bin/env python3
"""
Hirsakam コラ画像ジェネレーター
"""

from PIL import Image, ImageDraw, ImageFont
import os
import sys
import emoji
import requests
from io import BytesIO
import glob
try:
    from rembg import remove
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False
    print("Warning: rembg library not available. Background removal feature will be disabled.")

class HirsakamGenerator:
    # 設定定数
    DEFAULT_FONT_SIZE = 48
    DEFAULT_EMOJI_SIZE = 164
    DEFAULT_TEXT_COLOR = (255, 255, 255)
    DEFAULT_BACKGROUND_COLOR = (0, 0, 0)
    LINE_HEIGHT_RATIO = 1.2
    IMAGE_QUALITY = 95
    OUTLINE_WIDTH = 2
    TRANSPARENT_ALPHA_THRESHOLD = 128
    BACKGROUND_ALPHA_THRESHOLD = 32
    TEXT_CANVAS_PADDING = 100
    OVERLAY_PADDING = 50
    UNICODE_RANGES = {
        'HIRAGANA': (0x3040, 0x309F),
        'KATAKANA': (0x30A0, 0x30FF),
        'KANJI': (0x4E00, 0x9FAF),
        'FULLWIDTH': (0xFF00, 0xFFEF)
    }
    def __init__(self, base_image_path="hirsakam.jpg"):
        self.base_image_path = base_image_path
        # 猫の顔の中心位置（画像を精密に測定）
        self.face_center = (260, 143)
        
        # フォントパス定数
        self.EMOJI_FONT_PATHS = [
            "/System/Library/Fonts/Apple Color Emoji.ttc",
            "/System/Library/Fonts/Supplemental/Apple Color Emoji.ttc",
            "/Library/Fonts/Apple Color Emoji.ttc",
            "/System/Library/Fonts/Apple Color Emoji.ttf",
            "/System/Library/Fonts/Supplemental/Apple Color Emoji.ttf",
            "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/TTF/NotoColorEmoji.ttf",
            "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc"
        ]
        
        self.TEXT_FONT_PATHS = [
            "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
            "/System/Library/Fonts/Helvetica.ttc",
            "/System/Library/Fonts/Arial.ttf",
            "/usr/share/fonts/truetype/noto-cjk/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/TTF/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/truetype/takao-gothic/TakaoPGothic.ttf",
            "/usr/share/fonts/takao/TakaoPGothic.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/TTF/DejaVuSans.ttf",
            "/usr/share/fonts/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
            "/usr/share/fonts/liberation/LiberationSans-Regular.ttf",
            "/usr/share/fonts/TTF/LiberationSans-Regular.ttf",
            "/usr/share/fonts/truetype/ubuntu/Ubuntu-R.ttf",
            "/usr/share/fonts/TTF/arial.ttf",
            "/usr/share/fonts/corefonts/arial.ttf"
        ]
        
        self.JAPANESE_FONT_PATTERNS = [
            "**/NotoSansCJK*.ttc",
            "**/NotoSansCJK*.ttf",
            "**/NotoSans*CJK*.ttc",
            "**/NotoSans*CJK*.ttf",
            "**/Takao*.ttf",
            "**/VLGothic*.ttf",
            "**/IPAexGothic*.ttf",
            "**/IPAGothic*.ttf",
            "**/ヒラギノ*.ttc"
        ]
        
        self.FONT_SEARCH_DIRS = [
            "/usr/share/fonts/",
            "/usr/local/share/fonts/",
            "/System/Library/Fonts/",
            os.path.expanduser("~/.fonts/")
        ]
    
    def load_base_image(self):
        """ベース画像を読み込む"""
        if not os.path.exists(self.base_image_path):
            raise FileNotFoundError(f"ベース画像 {self.base_image_path} が見つかりません")
        return Image.open(self.base_image_path)
    
    def _contains_japanese(self, text):
        """テキストに日本語文字が含まれているかチェック"""
        if not text:
            return False
        for char in text:
            code = ord(char)
            for range_name, (start, end) in self.UNICODE_RANGES.items():
                if start <= code <= end:
                    return True
        return False

    def get_font(self, font_size=None, is_emoji=False, text=""):
        """フォントを取得する"""
        if font_size is None:
            font_size = self.DEFAULT_FONT_SIZE
            
        if is_emoji:
            for font_path in self.EMOJI_FONT_PATHS:
                try:
                    if os.path.exists(font_path):
                        print(f"絵文字フォント見つかりました: {font_path}")
                        return ImageFont.truetype(font_path, font_size)
                except Exception as e:
                    continue
            
            print("Warning: 絵文字フォントが見つかりません。テキストフォントを使用します。")
        
        # 日本語テキストの場合は日本語フォントを強制検索
        if self._contains_japanese(text):
            print("日本語テキストを検出。日本語フォントを優先検索します。")
            japanese_font = self._find_japanese_font(font_size)
            if japanese_font:
                return japanese_font
            print("Warning: 日本語フォントが見つかりません。汎用フォントを使用します。")
        
        for font_path in self.TEXT_FONT_PATHS:
            try:
                if os.path.exists(font_path):
                    print(f"テキストフォント見つかりました: {font_path}")
                    return ImageFont.truetype(font_path, font_size)
            except Exception as e:
                continue
        
        # 動的フォント検索を試行
        print("指定フォントが見つかりません。システムフォントを検索中...")
        dynamic_font = self._find_system_font(font_size)
        if dynamic_font:
            return dynamic_font
            
        print("Warning: TTFフォントが見つかりません。デフォルトフォントを使用します。")
        # フォント診断情報を出力
        self._print_font_diagnostics()
        return ImageFont.load_default()
    
    def _find_japanese_font(self, font_size):
        """日本語対応フォントを優先的に検索"""
        for search_dir in self.FONT_SEARCH_DIRS:
            if not os.path.exists(search_dir):
                continue
                
            for pattern in self.JAPANESE_FONT_PATTERNS:
                font_path = os.path.join(search_dir, pattern)
                matches = glob.glob(font_path, recursive=True)
                
                for match in matches:
                    try:
                        font = ImageFont.truetype(match, font_size)
                        print(f"日本語フォント見つかりました: {match}")
                        return font
                    except Exception as e:
                        continue
        
        return None
    
    def _print_font_diagnostics(self):
        """フォント診断情報を出力"""
        print("=== フォント診断情報 ===")
        font_extensions = ('.ttf', '.ttc', '.otf')
        max_examples = 3
        max_files_to_check = 5
        
        for font_dir in self.FONT_SEARCH_DIRS:
            expanded_dir = os.path.expanduser(font_dir)
            if os.path.exists(expanded_dir):
                print(f"フォントディレクトリ存在: {expanded_dir}")
                try:
                    fonts = []
                    for root, dirs, files in os.walk(expanded_dir):
                        for file in files[:max_files_to_check]:
                            if file.lower().endswith(font_extensions):
                                fonts.append(os.path.join(root, file))
                    if fonts:
                        print(f"  利用可能フォント例: {fonts[:max_examples]}")
                    else:
                        print(f"  TTF/TTCファイルが見つかりません")
                except Exception as e:
                    print(f"  アクセスエラー: {e}")
            else:
                print(f"フォントディレクトリ不存在: {expanded_dir}")
        print("=======================")
    
    def _find_system_font(self, font_size):
        """システム内のフォントを動的に検索"""
        # 日本語対応フォントを最優先にする
        font_patterns = [
            # 日本語フォント（最優先）
            "**/NotoSansCJK*.ttc",
            "**/NotoSansCJK*.ttf", 
            "**/NotoSans*CJK*.ttc",
            "**/NotoSans*CJK*.ttf",
            "**/Takao*.ttf",
            "**/VLGothic*.ttf",
            "**/IPAexGothic*.ttf",
            "**/IPAGothic*.ttf",
            # 日本語サポートのある汎用フォント
            "**/NotoSans*.ttf",
            # 英数字フォント（日本語非対応）
            "**/Liberation*.ttf",
            "**/DejaVu*.ttf",
            "**/Arial*.ttf",
            "**/Helvetica*.ttf",
            # 最後の手段
            "**/*.ttf",
            "**/*.ttc"
        ]
        
        for search_dir in self.FONT_SEARCH_DIRS:
            if not os.path.exists(search_dir):
                continue
                
            for pattern in font_patterns:
                font_path = os.path.join(search_dir, pattern)
                matches = glob.glob(font_path, recursive=True)
                
                for match in matches:
                    try:
                        font = ImageFont.truetype(match, font_size)
                        print(f"動的検索で見つかったフォント: {match}")
                        return font
                    except Exception as e:
                        continue
        
        return None
    
    def _apply_transforms(self, image, rotation, flip_horizontal, element_type="overlay"):
        """画像に回転と左右反転を適用する共通関数"""
        if rotation != 0:
            # 要素タイプと左右反転状態に応じて回転方向を調整
            if element_type == "overlay":
                adjusted_rotation = rotation if flip_horizontal else -rotation
            else:  # emoji
                adjusted_rotation = rotation if flip_horizontal else -rotation
            
            image = image.rotate(adjusted_rotation, expand=True)
            print(f"{element_type}回転完了: {adjusted_rotation}度")
        
        if flip_horizontal:
            image = image.transpose(Image.FLIP_LEFT_RIGHT)
            print(f"{element_type}左右反転完了")
        
        return image
    
    def add_text_to_image_legacy(self, image, text, position, color=None, font_size=None, is_face_overlay=False, is_emoji=False):
        """画像にテキストを追加する（改行対応）- レガシー版"""
        if color is None:
            color = self.DEFAULT_TEXT_COLOR
        if font_size is None:
            font_size = self.DEFAULT_FONT_SIZE
            
        # 絵文字の場合は専用の処理
        if is_emoji:
            return self.add_emoji_to_image(image, text, position, font_size)
        
        draw = ImageDraw.Draw(image)
        font = self.get_font(font_size, is_emoji, text=text)
        
        # 改行文字で分割
        lines = text.replace('\\n', '\n').split('\n')
        
        # 行間の計算
        line_height = font_size * self.LINE_HEIGHT_RATIO
        
        # 全体の高さを計算（背景用）
        total_height = len(lines) * line_height
        
        # 各行の幅を計算（背景の幅決定用）
        max_width = 0
        for line in lines:
            if line.strip():  # 空行でない場合のみ
                bbox = draw.textbbox((0, 0), line, font=font)
                line_width = bbox[2] - bbox[0]
                max_width = max(max_width, line_width)
        
        if is_face_overlay and max_width > 0:
            # 顔に被せる場合は背景を半透明にする
            padding = 10
            bg_bbox = (
                max(0, position[0] - padding),
                max(0, position[1] - padding),
                min(image.width, position[0] + max_width + padding),
                min(image.height, position[1] + total_height + padding)
            )
            
            # 半透明の背景を描画
            overlay = Image.new('RGBA', image.size, (0, 0, 0, 0))
            overlay_draw = ImageDraw.Draw(overlay)
            overlay_draw.rectangle(bg_bbox, fill=(0, 0, 0, 128))
            
            # 元画像をRGBAに変換
            if image.mode != 'RGBA':
                image = image.convert('RGBA')
            
            # オーバーレイを合成
            image = Image.alpha_composite(image, overlay)
            draw = ImageDraw.Draw(image)
        
        # 各行を描画
        x, y = position
        for i, line in enumerate(lines):
            if not line.strip():  # 空行の場合はスキップ
                continue
                
            current_y = y + (i * line_height)
            
            # テキストの境界線を描画（ASCII文字のみ）
            if not any(ord(char) > 127 for char in line):
                for dx in range(-self.OUTLINE_WIDTH, self.OUTLINE_WIDTH + 1):
                    for dy in range(-self.OUTLINE_WIDTH, self.OUTLINE_WIDTH + 1):
                        if dx != 0 or dy != 0:
                            draw.text((x + dx, current_y + dy), line, font=font, fill=self.DEFAULT_BACKGROUND_COLOR)
            
            # メインテキストを描画
            draw.text((x, current_y), line, font=font, fill=color)
        
        return image
    
    def add_emoji_to_image(self, image, emoji_text, position, font_size):
        """絵文字を画像に追加する（色を保持）"""
        try:
            # Apple Color Emojiフォントを直接指定（フォントインデックス0を明示）
            font_path = "/System/Library/Fonts/Apple Color Emoji.ttc"
            if os.path.exists(font_path):
                # フォントインデックスを0に指定
                font = ImageFont.truetype(font_path, font_size, index=0)
                print(f"Apple Color Emojiフォントを使用: {font_path} (index=0)")
            else:
                print("Apple Color Emojiフォントが見つかりません")
                # ヒラギノフォントで絵文字をサポート
                font = ImageFont.truetype("/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc", font_size)
            
            # 直接描画
            draw = ImageDraw.Draw(image)
            
            # Pillowの新しいバージョンで絵文字の色を保持
            try:
                draw.text(position, emoji_text, font=font, embedded_color=True)
                print("embedded_color=Trueで描画成功")
            except TypeError:
                # 古いPillowバージョン用のフォールバック
                draw.text(position, emoji_text, font=font)
                print("embedded_colorなしで描画")
            
            return image
            
        except Exception as e:
            print(f"絵文字描画エラー: {e}")
            # 最終フォールバック: システムデフォルトフォント
            try:
                draw = ImageDraw.Draw(image)
                # macOSのシステムフォントを試す
                font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
                draw.text(position, emoji_text, font=font, fill=(255, 255, 255))
                print("Helveticaフォントで描画")
                return image
            except Exception as e2:
                print(f"最終フォールバック描画エラー: {e2}")
                # デフォルトフォント
                draw = ImageDraw.Draw(image)
                font = ImageFont.load_default()
                draw.text(position, emoji_text, font=font, fill=(255, 255, 255))
                return image
    
    def download_emoji_image(self, emoji_char, size=128):
        """絵文字画像をTwitchから取得する"""
        try:
            # 絵文字のUnicodeコードポイントを取得
            codepoint = ord(emoji_char)
            hex_code = f"{codepoint:x}"
            
            # Twitch絵文字APIを使用
            url = f"https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/{hex_code}.png"
            
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                emoji_img = Image.open(BytesIO(response.content))
                print(f"ダウンロードした絵文字: {emoji_char}, モード: {emoji_img.mode}, サイズ: {emoji_img.size}")
                
                # 常にRGBAモードに変換
                if emoji_img.mode != 'RGBA':
                    emoji_img = emoji_img.convert('RGBA')
                    print(f"RGBAモードに変換: {emoji_img.mode}")
                
                # 透明性の処理（背景を透明にする）
                emoji_array = list(emoji_img.getdata())
                cleaned_data = []
                
                # 最も多い透明ピクセルの色を背景色として検出
                transparent_colors = {}
                for pixel in emoji_array:
                    r, g, b, a = pixel
                    if a == 0:  # 完全透明
                        color_key = (r, g, b)
                        transparent_colors[color_key] = transparent_colors.get(color_key, 0) + 1
                
                # 最も多い透明色を背景色とする
                background_color = None
                if transparent_colors:
                    background_color = max(transparent_colors.items(), key=lambda x: x[1])[0]
                    print(f"検出された背景色: RGB{background_color}, 出現回数: {transparent_colors[background_color]}")
                
                for pixel in emoji_array:
                    r, g, b, a = pixel
                    
                    # 背景色またはほぼ透明なピクセルを除去
                    is_background = (
                        a == 0 or  # 完全透明
                        (background_color and (r, g, b) == background_color) or  # 背景色
                        a < self.BACKGROUND_ALPHA_THRESHOLD  # ほぼ透明
                    )
                    
                    if is_background:
                        # 背景は完全透明
                        cleaned_data.append((0, 0, 0, 0))
                    else:
                        # 絵文字部分は不透明
                        cleaned_data.append((r, g, b, 255))
                
                emoji_img.putdata(cleaned_data)
                
                # サイズを調整（透明性処理後）
                emoji_img = emoji_img.resize((size, size), Image.Resampling.LANCZOS)
                
                # リサイズ後に再度透明性を修正（リサイズで中間値が生じるため）
                resized_array = list(emoji_img.getdata())
                final_data = []
                
                for pixel in resized_array:
                    r, g, b, a = pixel
                    # アルファ値が低い場合は完全透明に
                    if a < self.TRANSPARENT_ALPHA_THRESHOLD:
                        final_data.append((0, 0, 0, 0))
                    else:
                        # 絵文字部分は完全不透明に
                        final_data.append((r, g, b, 255))
                
                emoji_img.putdata(final_data)
                
                # 最終的な透明性確認
                alpha = emoji_img.split()[-1]
                alpha_values = set(alpha.getdata())
                print(f"処理後アルファ値: {alpha_values}")
                
                return emoji_img
            else:
                print(f"絵文字画像の取得に失敗: {url}")
                return None
                
        except Exception as e:
            print(f"絵文字画像取得エラー: {e}")
            return None
    
    def add_emoji_image_to_image(self, image, emoji_char, position, size=128):
        """Webからダウンロードした絵文字画像を重ねる"""
        try:
            emoji_img = self.download_emoji_image(emoji_char, size)
            if emoji_img is None:
                # フォールバック: テキスト絵文字
                return self.add_emoji_to_image(image, emoji_char, position, size//2)
            
            # 元画像をRGBAに変換
            if image.mode != 'RGBA':
                base_img = image.convert('RGBA')
            else:
                base_img = image.copy()
            
            # 絵文字画像もRGBAに変換
            if emoji_img.mode != 'RGBA':
                emoji_img = emoji_img.convert('RGBA')
            
            # 位置を調整（中央寄せ）
            x, y = position
            x = x - size // 2
            y = y - size // 2
            
            # 絵文字を貼り付け
            base_img.paste(emoji_img, (x, y), emoji_img)
            
            # RGBに戻す（元の画像の背景を保持）
            if image.mode != 'RGBA':
                rgb_result = Image.new('RGB', base_img.size)
                # 元の画像をベースとして使用
                rgb_result.paste(image.convert('RGB'), (0, 0))
                rgb_result.paste(base_img, mask=base_img.split()[-1])
                return rgb_result
            
            return base_img
            
        except Exception as e:
            print(f"絵文字画像合成エラー: {e}")
            # フォールバック: テキスト絵文字
            return self.add_emoji_to_image(image, emoji_char, position, 96)
    
    
    
    
    def add_drawing_overlay(self, base_image_path, drawing_image_path, output_path=None):
        """描画オーバーレイを既存の画像に合成"""
        try:
            # ベース画像を読み込み
            base_image = Image.open(base_image_path)
            
            # 描画画像を読み込み
            drawing_image = Image.open(drawing_image_path)
            
            # 描画画像をベース画像のサイズにリサイズ
            drawing_image = drawing_image.resize(base_image.size, Image.Resampling.LANCZOS)
            
            # 両方の画像をRGBAモードに変換
            if base_image.mode != 'RGBA':
                base_image = base_image.convert('RGBA')
            if drawing_image.mode != 'RGBA':
                drawing_image = drawing_image.convert('RGBA')
            
            # 描画画像を合成
            combined = Image.alpha_composite(base_image, drawing_image)
            
            # 出力パスが指定されていない場合はベース画像のパスを使用
            if output_path is None:
                output_path = base_image_path
            
            # 画像を保存（RGBAの場合はRGBに変換、元の背景を保持）
            if combined.mode == 'RGBA':
                # 元のベース画像の背景を保持してRGBに変換
                original_base = Image.open(base_image_path)
                rgb_image = original_base.convert('RGB')
                rgb_image.paste(combined, mask=combined.split()[-1])
                combined = rgb_image
            
            combined.save(output_path, "JPEG", quality=self.IMAGE_QUALITY)
            return output_path
            
        except Exception as e:
            print(f"描画オーバーレイ合成エラー: {e}")
            # エラーの場合は元の画像をそのまま返す
            return base_image_path

    def remove_background(self, image_path_or_obj):
        """画像の背景を透過処理する"""
        if not REMBG_AVAILABLE:
            print("Warning: rembg not available, skipping background removal")
            if isinstance(image_path_or_obj, str):
                return Image.open(image_path_or_obj)
            else:
                return image_path_or_obj
        
        try:
            if isinstance(image_path_or_obj, str):
                # ファイルパスの場合
                with open(image_path_or_obj, 'rb') as f:
                    input_data = f.read()
            else:
                # PIL Imageオブジェクトの場合
                with BytesIO() as buffer:
                    image_path_or_obj.save(buffer, format='PNG')
                    input_data = buffer.getvalue()
            
            # 背景透過処理
            output_data = remove(input_data)
            
            # 透過済み画像をPILオブジェクトとして返す
            result_image = Image.open(BytesIO(output_data)).convert('RGBA')
            return result_image
            
        except Exception as e:
            print(f"Background removal error: {e}")
            # エラーの場合は元の画像を返す
            if isinstance(image_path_or_obj, str):
                return Image.open(image_path_or_obj)
            else:
                return image_path_or_obj

    def add_overlay_image(self, base_image_path, overlay_image_path, x, y, width, height, opacity, rotation=0, remove_background=False, flip_horizontal=False, output_path=None):
        """オーバーレイ画像を既存の画像に合成"""
        try:
            # ベース画像を読み込み
            base_image = Image.open(base_image_path)
            
            # オーバーレイ画像を読み込み
            overlay_image = Image.open(overlay_image_path)
            
            # 背景透過処理を適用
            if remove_background:
                overlay_image = self.remove_background(overlay_image)
            
            # オーバーレイ画像を指定サイズにリサイズ
            overlay_image = overlay_image.resize((int(width), int(height)), Image.Resampling.LANCZOS)
            
            # 両方の画像をRGBAモードに変換
            if base_image.mode != 'RGBA':
                base_image = base_image.convert('RGBA')
            if overlay_image.mode != 'RGBA':
                overlay_image = overlay_image.convert('RGBA')
            
            # 透明度を適用
            if opacity < 1.0:
                # アルファチャンネルに透明度を適用
                alpha = overlay_image.split()[-1]
                alpha = alpha.point(lambda p: int(p * opacity))
                overlay_image.putalpha(alpha)
            
            # 回転と左右反転を適用
            overlay_image = self._apply_transforms(overlay_image, rotation, flip_horizontal, "オーバーレイ画像")
            
            # 回転後のサイズを更新
            if rotation != 0:
                width = overlay_image.width
                height = overlay_image.height
            
            # 位置を調整（中央寄せから左上基準に変換）
            paste_x = int(x - width / 2)
            paste_y = int(y - height / 2)
            
            # はみ出し部分をトリミングして合成（要素の自由配置を許可）
            try:
                base_image.paste(overlay_image, (paste_x, paste_y), overlay_image)
            except Exception:
                # 負の座標やはみ出しに対応
                # より大きなキャンバスを作成して合成後にトリミング
                expanded_width = max(base_image.width, paste_x + width)
                expanded_height = max(base_image.height, paste_y + height)
                expanded_canvas = Image.new('RGBA', (expanded_width, expanded_height), (0, 0, 0, 0))
                
                # 元の画像を配置
                expanded_canvas.paste(base_image, (0, 0))
                
                # オーバーレイを配置
                expanded_canvas.paste(overlay_image, (paste_x, paste_y), overlay_image)
                
                # 元のサイズにクロップ
                base_image = expanded_canvas.crop((0, 0, base_image.width, base_image.height))
            
            # 出力パスが指定されていない場合はベース画像のパスを使用
            if output_path is None:
                output_path = base_image_path
            
            # 画像を保存（RGBAの場合はRGBに変換、元の背景を保持）
            if base_image.mode == 'RGBA':
                # 元のベース画像の背景を保持してRGBに変換
                original_base = Image.open(base_image_path)
                rgb_image = original_base.convert('RGB')
                rgb_image.paste(base_image, mask=base_image.split()[-1])
                base_image = rgb_image
            
            base_image.save(output_path, "JPEG", quality=self.IMAGE_QUALITY)
            return output_path
            
        except Exception as e:
            print(f"オーバーレイ画像合成エラー: {e}")
            # エラーの場合は元の画像をそのまま返す
            return base_image_path
    
    def copy_base_image(self, output_path):
        """ベース画像を出力パスにコピーする"""
        try:
            base_image = self.load_base_image()
            # RGBモードで保存（透明性を含まない）
            if base_image.mode != 'RGB':
                base_image = base_image.convert('RGB')
            base_image.save(output_path, "JPEG", quality=self.IMAGE_QUALITY)
            print(f"ベース画像をコピーしました: {output_path}")
            return output_path
        except Exception as e:
            print(f"ベース画像コピーエラー: {e}")
            raise
    
    def crop_image(self, input_path, crop_x, crop_y, crop_width, crop_height, output_path=None):
        """画像をトリミングする"""
        try:
            # 画像を読み込み
            image = Image.open(input_path)
            
            # 出力パスが指定されていない場合は元のパスを使用
            if output_path is None:
                output_path = input_path
            
            # トリミング範囲を検証
            if crop_x < 0:
                crop_x = 0
            if crop_y < 0:
                crop_y = 0
            if crop_x + crop_width > image.width:
                crop_width = image.width - crop_x
            if crop_y + crop_height > image.height:
                crop_height = image.height - crop_y
            
            # トリミング範囲が有効かチェック
            if crop_width <= 0 or crop_height <= 0:
                print("Warning: Invalid crop dimensions, returning original image")
                return input_path
            
            # トリミング実行
            crop_box = (crop_x, crop_y, crop_x + crop_width, crop_y + crop_height)
            cropped_image = image.crop(crop_box)
            
            # RGBモードで保存（透明性を含まない）
            if cropped_image.mode != 'RGB':
                cropped_image = cropped_image.convert('RGB')
            
            cropped_image.save(output_path, "JPEG", quality=self.IMAGE_QUALITY)
            print(f"画像をトリミングしました: {output_path} (範囲: {crop_x}, {crop_y}, {crop_width}, {crop_height})")
            return output_path
            
        except Exception as e:
            print(f"トリミングエラー: {e}")
            # エラーの場合は元の画像をそのまま返す
            return input_path
    
    def add_text_to_image(self, input_path, text, position, color=None, font_size=None, rotation=0, output_path=None):
        """既存の画像にテキストを追加する"""
        if color is None:
            color = self.DEFAULT_TEXT_COLOR
        if font_size is None:
            font_size = self.DEFAULT_FONT_SIZE
            
        try:
            # 既存の画像を読み込み
            image = Image.open(input_path)
            
            # 出力パスが指定されていない場合は入力パスを使用
            if output_path is None:
                output_path = input_path
                
            # テキストを追加
            result_image = self.add_text_to_image_obj(image, text, position, color, font_size, rotation)
            
            # RGBモードで保存
            if result_image.mode != 'RGB':
                result_image = result_image.convert('RGB')
            result_image.save(output_path, "JPEG", quality=self.IMAGE_QUALITY)
            print(f"テキストを追加しました: {text} at {position}")
            return output_path
        except Exception as e:
            print(f"テキスト追加エラー: {e}")
            return input_path
    
    def add_text_to_image_obj(self, image, text, position, color=None, font_size=None, rotation=0):
        """画像オブジェクトにテキストを追加する（回転対応・複数行対応）"""
        if color is None:
            color = self.DEFAULT_TEXT_COLOR
        if font_size is None:
            font_size = self.DEFAULT_FONT_SIZE
            
        draw = ImageDraw.Draw(image)
        font = self.get_font(font_size, text=text)
        
        # 複数行テキストの処理
        lines = text.split('\n')
        line_height = font_size * self.LINE_HEIGHT_RATIO
        
        # 全体のテキストサイズを計算
        total_height = int(len(lines) * line_height)
        max_width = 0
        for line in lines:
            # 空行も含めて計算（フロントエンドと一致させる）
            if line.strip():
                bbox = draw.textbbox((0, 0), line, font=font)
                line_width = bbox[2] - bbox[0]
                max_width = max(max_width, line_width)
            else:
                # 空行の場合は最小幅を確保
                bbox = draw.textbbox((0, 0), ' ', font=font)
                line_width = bbox[2] - bbox[0]
                max_width = max(max_width, line_width)
        
        # 最小サイズを確保
        if max_width == 0:
            max_width = font_size
        if total_height == 0:
            total_height = int(line_height)
        
        if rotation != 0:
            # 回転する場合はテキストを一時的な透明画像に描画してから回転
            # 複数行を考慮したサイズで透明画像を作成
            text_img = Image.new('RGBA', (max_width + self.TEXT_CANVAS_PADDING, total_height + self.TEXT_CANVAS_PADDING), (0, 0, 0, 0))
            text_draw = ImageDraw.Draw(text_img)
            
            # 各行を描画
            for i, line in enumerate(lines):
                # 空行も含めて描画（フロントエンドと一致させる）
                if line.strip():
                    bbox = text_draw.textbbox((0, 0), line, font=font)
                    line_width = bbox[2] - bbox[0]
                    # 中央揃えで描画
                    line_x = self.OVERLAY_PADDING + (max_width - line_width) // 2
                    line_y = int(self.OVERLAY_PADDING + i * line_height)
                    text_draw.text((line_x, line_y), line, font=font, fill=color)
                # 空行の場合は何も描画しないが、スペースは確保される
            
            # PillowとCSSの回転方向の違いを修正（負の値で時計回り）
            rotated_text = text_img.rotate(-rotation, expand=True)
            
            # 位置調整して合成
            paste_x = position[0] - rotated_text.width // 2
            paste_y = position[1] - rotated_text.height // 2
            
            # RGBAモードに変換して合成
            if image.mode != 'RGBA':
                image = image.convert('RGBA')
            
            image.paste(rotated_text, (paste_x, paste_y), rotated_text)
        else:
            # 回転なしの場合は直接描画（複数行対応）
            start_y = int(position[1] - total_height // 2)
            
            for i, line in enumerate(lines):
                # 空行も含めて描画（フロントエンドと一致させる）
                if line.strip():
                    bbox = draw.textbbox((0, 0), line, font=font)
                    line_width = bbox[2] - bbox[0]
                    # 中央揃えで描画
                    line_x = position[0] - line_width // 2
                    line_y = int(start_y + i * line_height)
                    draw.text((line_x, line_y), line, font=font, fill=color)
                # 空行の場合は何も描画しないが、スペースは確保される
        
        return image
    
    def add_emoji_to_image(self, input_path, emoji_char, position, size=None, rotation=0, flip_horizontal=False, output_path=None):
        """既存の画像に絵文字を追加する（透明性を保持）"""
        if size is None:
            size = self.DEFAULT_EMOJI_SIZE
            
        try:
            # 既存の画像を読み込み
            image = Image.open(input_path)
            
            # 出力パスが指定されていない場合は入力パスを使用
            if output_path is None:
                output_path = input_path
                
            # 絵文字を追加
            result_image = self.add_emoji_to_image_obj(image, emoji_char, position, size, rotation, flip_horizontal)
            
            # RGBモードで保存（元の背景を保持）
            if result_image.mode != 'RGB':
                if result_image.mode == 'RGBA':
                    # 元の画像をベースとしてRGB変換
                    rgb_image = Image.new('RGB', result_image.size)
                    # 元のベース画像の背景を使用
                    base_rgb = image.convert('RGB') if image.mode != 'RGB' else image
                    rgb_image.paste(base_rgb, (0, 0))
                    rgb_image.paste(result_image, mask=result_image.split()[-1] if result_image.mode == 'RGBA' else None)
                    result_image = rgb_image
                else:
                    result_image = result_image.convert('RGB')
            
            result_image.save(output_path, "JPEG", quality=self.IMAGE_QUALITY)
            print(f"絵文字を追加しました: {emoji_char} at {position}")
            return output_path
        except Exception as e:
            print(f"絵文字追加エラー: {e}")
            return input_path
    
    def add_emoji_to_image_obj(self, image, emoji_char, position, size=None, rotation=0, flip_horizontal=False):
        """画像オブジェクトに絵文字を追加する（回転対応、透明性保持）"""
        if size is None:
            size = self.DEFAULT_EMOJI_SIZE
            
        try:
            # 絵文字画像をダウンロード（透明性処理済み）
            emoji_image = self.download_emoji_image(emoji_char, size)
            if emoji_image is None:
                print(f"絵文字画像の取得に失敗: {emoji_char}")
                return image
            
            print(f"絵文字合成開始: {emoji_char}, 回転: {rotation}度")
            
            # 回転と左右反転を適用
            emoji_image = self._apply_transforms(emoji_image, rotation, flip_horizontal, "絵文字")
            
            # 位置調整して合成
            paste_x = position[0] - emoji_image.width // 2
            paste_y = position[1] - emoji_image.height // 2
            
            # RGBAモードに変換して透明性を保持した合成
            if image.mode != 'RGBA':
                image = image.convert('RGBA')
            
            # アルファマスクを使用して透明性を保持して合成
            image.paste(emoji_image, (paste_x, paste_y), emoji_image)
            print(f"絵文字合成完了: 位置({paste_x}, {paste_y})")
            
            return image
        except Exception as e:
            print(f"絵文字合成エラー: {e}")
            return image

