#!/usr/bin/env python3
"""
Hirsakam コラ画像ジェネレーター
"""

import argparse
from PIL import Image, ImageDraw, ImageFont
import os
import sys
import emoji
import requests
from io import BytesIO

class HirsakamGenerator:
    def __init__(self, base_image_path="hirsakam.jpg"):
        self.base_image_path = base_image_path
        # 猫の顔の中心位置（画像を精密に測定）
        self.face_center = (190, 115)
    
    def load_base_image(self):
        """ベース画像を読み込む"""
        if not os.path.exists(self.base_image_path):
            raise FileNotFoundError(f"ベース画像 {self.base_image_path} が見つかりません")
        return Image.open(self.base_image_path)
    
    def get_font(self, font_size=48, is_emoji=False):
        """フォントを取得する"""
        if is_emoji:
            # macOSの絵文字フォントパスを詳細に試す
            emoji_fonts = [
                "/System/Library/Fonts/Apple Color Emoji.ttc",
                "/System/Library/Fonts/Supplemental/Apple Color Emoji.ttc",
                "/Library/Fonts/Apple Color Emoji.ttc",
                "/System/Library/Fonts/Apple Color Emoji.ttf",
                "/System/Library/Fonts/Supplemental/Apple Color Emoji.ttf"
            ]
            
            for font_path in emoji_fonts:
                try:
                    if os.path.exists(font_path):
                        print(f"絵文字フォント見つかりました: {font_path}")
                        return ImageFont.truetype(font_path, font_size)
                except Exception as e:
                    print(f"フォント読み込みエラー {font_path}: {e}")
                    continue
            
            # macOSでSFフォントを試す（絵文字をサポート）
            try:
                return ImageFont.truetype("/System/Library/Fonts/SF-Pro-Display-Regular.otf", font_size)
            except:
                pass
            
            # ヒラギノフォントを試す（絵文字をサポート）
            try:
                return ImageFont.truetype("/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc", font_size)
            except:
                pass
            
            print("Warning: 絵文字フォントが見つかりません。デフォルトフォントを使用します。")
        
        try:
            # macOSのヒラギノフォントを試す
            return ImageFont.truetype("/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc", font_size)
        except OSError:
            try:
                # macOSの代替フォント
                return ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
            except OSError:
                # デフォルトフォント
                return ImageFont.load_default()
    
    def add_text_to_image(self, image, text, position, color=(255, 255, 255), font_size=48, is_face_overlay=False, is_emoji=False):
        """画像にテキストを追加する"""
        # 絵文字の場合は専用の処理
        if is_emoji:
            return self.add_emoji_to_image(image, text, position, font_size)
        
        draw = ImageDraw.Draw(image)
        font = self.get_font(font_size, is_emoji)
        
        if is_face_overlay:
            # 顔に被せる場合は背景を半透明にする
            text_bbox = draw.textbbox(position, text, font=font)
            padding = 10
            bg_bbox = (
                max(0, text_bbox[0] - padding),
                max(0, text_bbox[1] - padding),
                min(image.width, text_bbox[2] + padding),
                min(image.height, text_bbox[3] + padding)
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
        
        # テキストの境界線を描画（ASCII文字のみ）
        if not any(ord(char) > 127 for char in text):
            x, y = position
            outline_width = 2
            for dx in range(-outline_width, outline_width + 1):
                for dy in range(-outline_width, outline_width + 1):
                    if dx != 0 or dy != 0:
                        draw.text((x + dx, y + dy), text, font=font, fill=(0, 0, 0))
        
        # メインテキストを描画
        draw.text(position, text, font=font, fill=color)
        
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
                # サイズを調整
                emoji_img = emoji_img.resize((size, size), Image.Resampling.LANCZOS)
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
            
            # RGBに戻す
            if image.mode != 'RGBA':
                rgb_result = Image.new('RGB', base_img.size, (255, 255, 255))
                rgb_result.paste(base_img, mask=base_img.split()[-1])
                return rgb_result
            
            return base_img
            
        except Exception as e:
            print(f"絵文字画像合成エラー: {e}")
            # フォールバック: テキスト絵文字
            return self.add_emoji_to_image(image, emoji_char, position, 96)
    
    
    def generate_with_emoji(self, emoji_char, position=(330, 180), size=250, output_path=None):
        """絵文字を使用してコラ画像を生成"""
        image = self.load_base_image()
        
        # 絵文字画像を追加
        image = self.add_emoji_image_to_image(image, emoji_char, position, size)
        
        # 出力パスを決定
        if output_path is None:
            os.makedirs("output", exist_ok=True)
            output_path = f"output/hirsakam_emoji_{ord(emoji_char):x}.jpg"
        
        # 画像を保存（RGBAの場合はRGBに変換）
        if image.mode == 'RGBA':
            # 白背景でRGBに変換
            rgb_image = Image.new('RGB', image.size, (255, 255, 255))
            rgb_image.paste(image, mask=image.split()[-1])
            image = rgb_image
        
        image.save(output_path, "JPEG", quality=95)
        return output_path
    
    def generate_custom(self, text, position=(50, 50), color=(255, 255, 255), font_size=48, output_path=None):
        """カスタムテキストでコラ画像を生成"""
        image = self.load_base_image()
        
        # テキストを追加
        image = self.add_text_to_image(image, text, position, color, font_size)
        
        # 出力パスを決定
        if output_path is None:
            os.makedirs("output", exist_ok=True)
            output_path = f"output/hirsakam_custom.jpg"
        
        # 画像を保存（RGBAの場合はRGBに変換）
        if image.mode == 'RGBA':
            # 白背景でRGBに変換
            rgb_image = Image.new('RGB', image.size, (255, 255, 255))
            rgb_image.paste(image, mask=image.split()[-1])
            image = rgb_image
        
        image.save(output_path, "JPEG", quality=95)
        return output_path

def main():
    parser = argparse.ArgumentParser(description="Hirsakam コラ画像ジェネレーター")
    parser.add_argument("--base", default="hirsakam.jpg", help="ベース画像のパス")
    parser.add_argument("--text", help="カスタムテキスト")
    parser.add_argument("--emoji", help="絵文字（例: 😍）")
    parser.add_argument("--output", help="出力ファイル名")
    parser.add_argument("--x", type=int, default=50, help="テキストのX座標")
    parser.add_argument("--y", type=int, default=50, help="テキストのY座標")
    parser.add_argument("--size", type=int, default=48, help="フォントサイズ")
    parser.add_argument("--emoji-size", type=int, default=150, help="絵文字のサイズ")
    
    args = parser.parse_args()
    
    generator = HirsakamGenerator(args.base)
    
    try:
        if args.emoji:
            output_path = generator.generate_with_emoji(
                args.emoji,
                (args.x, args.y),
                args.emoji_size,
                args.output
            )
            print(f"絵文字 '{args.emoji}' で画像を生成しました: {output_path}")
        elif args.text:
            output_path = generator.generate_custom(
                args.text, 
                (args.x, args.y),
                font_size=args.size,
                output_path=args.output
            )
            print(f"カスタムテキストで画像を生成しました: {output_path}")
        else:
            print("--emoji または --text を指定してください")
            print("使用方法:")
            print("  python hirsakam_generator.py --emoji 😍")
            print("  python hirsakam_generator.py --emoji 😍 --emoji-size 250 --x 330 --y 180")
            print("  python hirsakam_generator.py --text 'カスタムテキスト'")
    
    except Exception as e:
        print(f"エラー: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()