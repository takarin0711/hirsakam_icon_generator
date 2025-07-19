#!/usr/bin/env python3
"""
FastAPI backend for Hirsakam Icon Generator
"""

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
import os
import tempfile
import shutil
from hirsakam_icon_generator import HirsakamGenerator
import uuid
import uvicorn
# 統一された環境変数ファイルを読み込み（python-dotenv不要版）
def load_env_file():
    """統一された環境変数ファイルを読み込み"""
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "env", ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        key = key.strip()
                        value = value.strip().strip('"').strip("'")
                        os.environ[key] = value
            print(f"📄 環境変数ファイルを読み込み: {env_path}")
        except Exception as e:
            print(f"⚠️ 環境変数ファイル読み込みエラー: {e}")
    else:
        print(f"📄 環境変数ファイルが見つかりません: {env_path} (デフォルト設定を使用)")

# 環境変数ファイルを読み込み
load_env_file()

# ファイルサイズ制限を設定（5MB）
app = FastAPI(
    title="Hirsakam Icon Generator API", 
    version="1.0.0",
    # max_request_size は直接設定できないため、uvicornで設定する
)

# CORS設定（フロントエンドとの通信用）
# 環境変数からサーバーURLを取得、デフォルトはlocalhost
server_url = os.getenv("SERVER_URL", "http://localhost")
if server_url == "*":
    # 本番環境で全てのオリジンを許可する場合（注意: セキュリティリスクあり）
    frontend_urls = ["*"]
else:
    # ポート3000を自動追加してフロントエンドURLを構築
    frontend_urls = [f"{server_url}:3000"]
    # 開発環境用に追加のローカルホストパターンも許可
    if "http://localhost:3000" not in frontend_urls:
        frontend_urls.append("http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_urls,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静的ファイルの提供（親ディレクトリを参照）
from starlette.middleware.base import BaseHTTPMiddleware

class CORSStaticFilesMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        if request.url.path.startswith('/static/'):
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Methods"] = "GET"
            response.headers["Access-Control-Allow-Headers"] = "*"
        return response

app.add_middleware(CORSStaticFilesMiddleware)
app.mount("/static", StaticFiles(directory=".."), name="static")

@app.get("/default-image")
async def get_default_image():
    """デフォルトのhirsakam.jpg画像を提供"""
    from fastapi import Response
    hirsakam_path = os.path.join("..", "hirsakam.jpg")
    if os.path.exists(hirsakam_path):
        # CORSヘッダーを明示的に設定
        response = FileResponse(hirsakam_path, media_type="image/jpeg")
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET"
        response.headers["Access-Control-Allow-Headers"] = "*"
        return response
    else:
        raise HTTPException(status_code=404, detail="デフォルト画像が見つかりません")

# アップロードされたファイルの一時保存（親ディレクトリに保存）
UPLOAD_DIR = os.path.join("..", "temp_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class GenerateRequest(BaseModel):
    text: Optional[str] = None
    emoji: Optional[str] = None
    x: int = 260  # 猫の顔の中心位置
    y: int = 143  # 猫の顔の中心位置
    font_size: int = 48
    emoji_size: int = 164

@app.get("/")
async def root():
    return {"message": "Hirsakam Icon Generator API"}

@app.post("/generate")
async def generate_icon(
    text: Optional[str] = Form(None),
    emoji: Optional[str] = Form(None),
    text_x: int = Form(260),  # テキストのX座標
    text_y: int = Form(143),  # テキストのY座標
    emoji_x: int = Form(260),  # 絵文字のX座標
    emoji_y: int = Form(143),  # 絵文字のY座標
    font_size: int = Form(48),
    emoji_size: int = Form(164),
    text_color: str = Form("#ffffff"),
    text_rotation: int = Form(0),  # テキストの回転角度
    emoji_rotation: int = Form(0),  # 絵文字の回転角度
    emoji_flip_horizontal: bool = Form(False),  # 絵文字の左右反転
    base_image: Optional[UploadFile] = File(None),
    drawing_data: Optional[UploadFile] = File(None),
    overlay_images: Optional[str] = Form(None),  # JSON string with overlay data
    layer_order: Optional[str] = Form(None)  # JSON string with layer order
):
    """
    アイコンを生成する
    """
    try:
        print(f"Debug: text={text}, emoji={emoji}, text_pos=({text_x},{text_y}), emoji_pos=({emoji_x},{emoji_y}), font_size={font_size}, emoji_size={emoji_size}, text_color={text_color}")
        
        # ベース画像のパス（親ディレクトリから参照）
        base_image_path = os.path.join("..", "hirsakam.jpg")
        
        # カスタム画像がアップロードされた場合
        if base_image:
            # 一意のファイル名を生成
            file_id = str(uuid.uuid4())
            file_extension = os.path.splitext(base_image.filename)[1]
            temp_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_extension}")
            
            # ファイルを保存
            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(base_image.file, buffer)
            
            base_image_path = temp_path
        
        # ジェネレーターを初期化
        generator = HirsakamGenerator(base_image_path)
        
        # 出力ファイル名を生成（親ディレクトリのoutputフォルダ）
        output_id = str(uuid.uuid4())
        output_path = os.path.join("..", "output", f"image_{output_id}.jpg")
        
        # ベース画像をコピーして開始
        result_path = output_path
        generator.copy_base_image(result_path)
        
        # レイヤー順序を解析（デフォルト: ['text', 'emoji', 'overlay']）
        import json
        import base64
        try:
            if layer_order:
                layer_order_list = json.loads(layer_order)
            else:
                layer_order_list = ['text', 'emoji', 'overlay']
        except:
            layer_order_list = ['text', 'emoji', 'overlay']
        
        print(f"Layer order: {layer_order_list}")
        
        # レイヤー順序に基づいて処理
        def process_layer(layer_type, current_path):
            if layer_type == 'text' and text:
                # カラーコードをRGBタプルに変換
                def hex_to_rgb(hex_color):
                    hex_color = hex_color.lstrip('#')
                    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
                
                color_rgb = hex_to_rgb(text_color)
                return generator.add_text_to_image(
                    current_path,
                    text, 
                    (text_x, text_y), 
                    color=color_rgb,
                    font_size=font_size,
                    rotation=text_rotation,
                    output_path=current_path
                )
            elif layer_type == 'emoji' and emoji:
                return generator.add_emoji_to_image(
                    current_path,
                    emoji, 
                    (emoji_x, emoji_y), 
                    emoji_size,
                    rotation=emoji_rotation,
                    flip_horizontal=emoji_flip_horizontal,
                    output_path=current_path
                )
            elif layer_type == 'overlay' and overlay_images:
                # オーバーレイ画像を処理
                print("Overlay images data received, processing...")
                current_result_path = current_path
                try:
                    overlay_data = json.loads(overlay_images)
                    for overlay in overlay_data:
                        # オーバーレイ画像をbase64からデコードして保存
                        overlay_id = str(uuid.uuid4())
                        overlay_temp_path = os.path.join(UPLOAD_DIR, f"overlay_{overlay_id}.png")
                        
                        # base64データから画像ファイルを作成
                        image_data = base64.b64decode(overlay['data'].split(',')[1])
                        with open(overlay_temp_path, "wb") as f:
                            f.write(image_data)
                        
                        # オーバーレイ画像を合成
                        current_result_path = generator.add_overlay_image(
                            current_result_path, 
                            overlay_temp_path, 
                            overlay['x'], 
                            overlay['y'], 
                            overlay['width'], 
                            overlay['height'], 
                            overlay['opacity'],
                            overlay.get('rotation', 0),
                            overlay.get('removeBackground', False),
                            overlay.get('flipHorizontal', False),
                            current_result_path
                        )
                        
                        # 一時ファイルを削除
                        if os.path.exists(overlay_temp_path):
                            os.remove(overlay_temp_path)
                            
                except Exception as e:
                    print(f"Error processing overlay images: {e}")
                return current_result_path
            return current_path
        
        # レイヤー順序に従って処理
        for layer_type in layer_order_list:
            result_path = process_layer(layer_type, result_path)
        
        # コンテンツが何もない場合のエラーチェック
        if not text and not emoji and not drawing_data and not overlay_images:
            raise HTTPException(status_code=400, detail="テキスト、絵文字、描画、またはオーバーレイ画像のいずれかを指定してください")

        # 描画データがある場合は最後に合成（最上位レイヤー）
        if drawing_data:
            print("Drawing data received, processing...")
            # 描画データを一時ファイルとして保存
            drawing_id = str(uuid.uuid4())
            drawing_temp_path = os.path.join(UPLOAD_DIR, f"drawing_{drawing_id}.png")
            
            with open(drawing_temp_path, "wb") as buffer:
                shutil.copyfileobj(drawing_data.file, buffer)
            
            # 描画データを合成
            result_path = generator.add_drawing_overlay(result_path, drawing_temp_path, output_path)
            
            # 描画一時ファイルを削除
            if os.path.exists(drawing_temp_path):
                os.remove(drawing_temp_path)
        
        # 一時ファイルを削除（アップロードされたファイルのみ）
        hirsakam_default = os.path.join("..", "hirsakam.jpg")
        if base_image and base_image_path != hirsakam_default and os.path.exists(base_image_path):
            os.remove(base_image_path)
        
        return {
            "success": True,
            "output_path": result_path,
            "download_url": f"/download/{os.path.basename(result_path)}"
        }
        
    except Exception as e:
        # エラー時に一時ファイルを削除（アップロードされたファイルのみ）
        hirsakam_default = os.path.join("..", "hirsakam.jpg")
        if (base_image and 'base_image_path' in locals() and 
            base_image_path != hirsakam_default and os.path.exists(base_image_path)):
            os.remove(base_image_path)
        
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/download/{filename}")
async def download_file(filename: str):
    """
    生成されたファイルをダウンロード
    """
    file_path = os.path.join("..", "output", filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="ファイルが見つかりません")
    
    # CORSヘッダーを明示的に設定
    response = FileResponse(
        path=file_path,
        filename=filename,
        media_type='image/jpeg'
    )
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

@app.get("/gallery")
async def get_gallery(sort: str = "desc", offset: int = 0, limit: int = 20):
    """
    生成済みの画像一覧を取得
    Args:
        sort: ソート順 ("asc" = 古い順, "desc" = 新しい順, デフォルト: desc)
        offset: 開始位置 (デフォルト: 0)
        limit: 取得件数 (デフォルト: 20, 最大: 100)
    """
    try:
        # limitの上限を設定
        limit = min(limit, 100)
        
        output_dir = os.path.join("..", "output")
        if not os.path.exists(output_dir):
            return {
                "images": [],
                "total": 0,
                "offset": offset,
                "limit": limit,
                "has_next": False,
                "has_prev": False
            }
        
        images = []
        for filename in os.listdir(output_dir):
            if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                file_path = os.path.join(output_dir, filename)
                # ファイルの作成時刻を取得
                creation_time = os.path.getctime(file_path)
                images.append({
                    "filename": filename,
                    "url": f"/download/{filename}",
                    "created_at": creation_time
                })
        
        # ソート順に応じて並び替え
        if sort.lower() == "asc":
            # 古い順（昇順）
            images.sort(key=lambda x: x["created_at"])
        else:
            # 新しい順（降順）- デフォルト
            images.sort(key=lambda x: x["created_at"], reverse=True)
        
        # 総件数を取得
        total = len(images)
        
        # ページング処理
        paginated_images = images[offset:offset + limit]
        
        # created_atフィールドを除去（フロントエンドには不要）
        for image in paginated_images:
            del image["created_at"]
        
        # ページング情報を計算
        has_next = offset + limit < total
        has_prev = offset > 0
        
        return {
            "images": paginated_images,
            "total": total,
            "offset": offset,
            "limit": limit,
            "has_next": has_next,
            "has_prev": has_prev
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/crop")
async def crop_image(
    base_image: Optional[UploadFile] = File(None),
    crop_x: int = Form(...),
    crop_y: int = Form(...),
    crop_width: int = Form(...),
    crop_height: int = Form(...)
):
    """
    画像をトリミングする
    """
    try:
        print(f"Crop request: x={crop_x}, y={crop_y}, width={crop_width}, height={crop_height}")
        
        # ベース画像のパス
        base_image_path = os.path.join("..", "hirsakam.jpg")
        
        # カスタム画像がアップロードされた場合
        if base_image:
            # 一意のファイル名を生成
            file_id = str(uuid.uuid4())
            file_extension = os.path.splitext(base_image.filename)[1]
            temp_path = os.path.join(UPLOAD_DIR, f"{file_id}{file_extension}")
            
            # ファイルを保存
            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(base_image.file, buffer)
            
            base_image_path = temp_path
        
        # ジェネレーターを初期化
        generator = HirsakamGenerator(base_image_path)
        
        # 出力ファイル名を生成
        output_id = str(uuid.uuid4())
        output_path = os.path.join(UPLOAD_DIR, f"cropped_{output_id}.jpg")
        
        # トリミング実行
        result_path = generator.crop_image(
            base_image_path, 
            crop_x, crop_y, crop_width, crop_height, 
            output_path
        )
        
        print(f"Crop completed: {result_path}")
        
        # 一時ファイルを削除（アップロードされたファイルのみ）
        hirsakam_default = os.path.join("..", "hirsakam.jpg")
        if base_image and base_image_path != hirsakam_default and os.path.exists(base_image_path):
            os.remove(base_image_path)
        
        # トリミングされた画像を返す
        from starlette.background import BackgroundTask
        
        def cleanup_file():
            # レスポンス送信後にファイルを削除
            if os.path.exists(result_path):
                try:
                    os.remove(result_path)
                    print(f"Cleaned up temporary crop file: {result_path}")
                except Exception as e:
                    print(f"Failed to cleanup crop file: {e}")
        
        response = FileResponse(
            path=result_path,
            filename=f"cropped_{output_id}.jpg",
            media_type='image/jpeg',
            background=BackgroundTask(cleanup_file)
        )
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "POST"
        response.headers["Access-Control-Allow-Headers"] = "*"
        
        return response
        
    except Exception as e:
        print(f"Crop error: {e}")
        # エラー時に一時ファイルを削除
        hirsakam_default = os.path.join("..", "hirsakam.jpg")
        if (base_image and 'base_image_path' in locals() and 
            base_image_path != hirsakam_default and os.path.exists(base_image_path)):
            os.remove(base_image_path)
        
        # トリミング結果ファイルも削除（存在する場合）
        if 'result_path' in locals() and os.path.exists(result_path):
            try:
                os.remove(result_path)
                print(f"Cleaned up failed crop file: {result_path}")
            except Exception as cleanup_error:
                print(f"Failed to cleanup failed crop file: {cleanup_error}")
        
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/gacha")
async def gacha():
    """
    ガチャを引く
    """
    try:
        import random
        import glob
        
        # ガチャ確率設定
        probabilities = {
            'N': 0.50,    # 50%
            'R': 0.30,    # 30%
            'SR': 0.17,   # 17%
            'SSR': 0.03   # 3%
        }
        
        # レアリティを抽選
        rand = random.random()
        cumulative = 0
        selected_rarity = None
        
        for rarity, prob in probabilities.items():
            cumulative += prob
            if rand <= cumulative:
                selected_rarity = rarity
                break
        
        # 画像ディレクトリのマッピング
        rarity_dirs = {
            'N': 'normal',
            'R': 'rare', 
            'SR': 'super_rare',
            'SSR': 'special_super_rare'
        }
        
        # 対応するディレクトリから画像を選択
        gacha_dir = os.path.join("..", "hirsakam_gacha_image", rarity_dirs[selected_rarity])
        
        if not os.path.exists(gacha_dir):
            raise HTTPException(status_code=500, detail=f"ガチャ画像ディレクトリが見つかりません: {gacha_dir}")
        
        # ディレクトリ内の画像ファイルを取得
        image_files = []
        for ext in ['*.jpg', '*.jpeg', '*.png', '*.gif']:
            image_files.extend(glob.glob(os.path.join(gacha_dir, ext)))
        
        if not image_files:
            raise HTTPException(status_code=500, detail=f"ガチャ画像が見つかりません: {gacha_dir}")
        
        # ランダムに画像を選択
        selected_image = random.choice(image_files)
        image_filename = os.path.basename(selected_image)
        
        return {
            "rarity": selected_rarity,
            "image_url": f"/gacha-image/{rarity_dirs[selected_rarity]}/{image_filename}",
            "filename": image_filename
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/gacha-ten")
async def gacha_ten():
    """
    10連ガチャを引く
    """
    try:
        import random
        import glob
        
        # ガチャ確率設定（通常の9枚）
        probabilities = {
            'N': 0.50,    # 50%
            'R': 0.30,    # 30%
            'SR': 0.17,   # 17%
            'SSR': 0.03   # 3%
        }
        
        # 最後の1枚用の確率設定（SR以上確定）
        guaranteed_probabilities = {
            'SR': 0.90,   # 90%
            'SSR': 0.10   # 10%
        }
        
        # 画像ディレクトリのマッピング
        rarity_dirs = {
            'N': 'normal',
            'R': 'rare', 
            'SR': 'super_rare',
            'SSR': 'special_super_rare'
        }
        
        def get_random_image(selected_rarity):
            """指定されたレアリティの画像をランダムに選択"""
            gacha_dir = os.path.join("..", "hirsakam_gacha_image", rarity_dirs[selected_rarity])
            
            if not os.path.exists(gacha_dir):
                raise HTTPException(status_code=500, detail=f"ガチャ画像ディレクトリが見つかりません: {gacha_dir}")
            
            # ディレクトリ内の画像ファイルを取得
            image_files = []
            for ext in ['*.jpg', '*.jpeg', '*.png', '*.gif']:
                image_files.extend(glob.glob(os.path.join(gacha_dir, ext)))
            
            if not image_files:
                raise HTTPException(status_code=500, detail=f"ガチャ画像が見つかりません: {gacha_dir}")
            
            # ランダムに画像を選択
            selected_image = random.choice(image_files)
            image_filename = os.path.basename(selected_image)
            
            return {
                "rarity": selected_rarity,
                "image_url": f"/gacha-image/{rarity_dirs[selected_rarity]}/{image_filename}",
                "filename": image_filename
            }
        
        def draw_gacha(probs):
            """確率に基づいてレアリティを抽選"""
            rand = random.random()
            cumulative = 0
            for rarity, prob in probs.items():
                cumulative += prob
                if rand <= cumulative:
                    return rarity
            return list(probs.keys())[-1]  # フォールバック
        
        results = []
        
        # 最初の9枚を通常確率で抽選
        for i in range(9):
            selected_rarity = draw_gacha(probabilities)
            result = get_random_image(selected_rarity)
            results.append(result)
        
        # 最後の1枚をSR以上確定で抽選
        guaranteed_rarity = draw_gacha(guaranteed_probabilities)
        guaranteed_result = get_random_image(guaranteed_rarity)
        results.append(guaranteed_result)
        
        return {
            "results": results,
            "total_count": 10
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/gacha-image/{rarity}/{filename}")
async def get_gacha_image(rarity: str, filename: str):
    """
    ガチャ画像を提供
    """
    try:
        # セキュリティチェック: パストラバーサル攻撃を防ぐ
        if '..' in rarity or '..' in filename or '/' in rarity or '\\' in rarity:
            raise HTTPException(status_code=400, detail="Invalid path")
        
        rarity_dirs = {
            'normal': 'normal',
            'rare': 'rare', 
            'super_rare': 'super_rare',
            'special_super_rare': 'special_super_rare'
        }
        
        if rarity not in rarity_dirs:
            raise HTTPException(status_code=400, detail="Invalid rarity")
        
        image_path = os.path.join("..", "hirsakam_gacha_image", rarity_dirs[rarity], filename)
        
        if not os.path.exists(image_path):
            raise HTTPException(status_code=404, detail="ガチャ画像が見つかりません")
        
        # ファイル拡張子から適切なメディアタイプを決定
        ext = os.path.splitext(filename)[1].lower()
        media_type_map = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg', 
            '.png': 'image/png',
            '.gif': 'image/gif'
        }
        media_type = media_type_map.get(ext, 'application/octet-stream')
        
        response = FileResponse(
            path=image_path,
            filename=filename,
            media_type=media_type
        )
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET"
        response.headers["Access-Control-Allow-Headers"] = "*"
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/other-images")
async def get_other_images():
    """
    other_imageディレクトリの画像一覧を取得
    """
    try:
        import glob
        
        other_image_dir = os.path.join("..", "other_image")
        print(f"Debug: other_image_dir = {other_image_dir}")
        print(f"Debug: Directory exists = {os.path.exists(other_image_dir)}")
        
        if not os.path.exists(other_image_dir):
            print("Debug: Directory does not exist")
            return {"images": []}
        
        # 画像ファイルを取得
        image_files = []
        for ext in ['*.jpg', '*.jpeg', '*.png', '*.gif']:
            files = glob.glob(os.path.join(other_image_dir, ext))
            print(f"Debug: {ext} files = {files}")
            image_files.extend(files)
        
        # ファイル名のみを返す
        image_names = [os.path.basename(img) for img in image_files]
        print(f"Debug: image_names = {image_names}")
        
        return {"images": image_names}
        
    except Exception as e:
        print(f"Debug: Exception = {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/other-image/{filename}")
async def get_other_image(filename: str):
    """
    other_imageディレクトリの画像を提供
    """
    try:
        # セキュリティチェック: パストラバーサル攻撃を防ぐ
        if '..' in filename or '/' in filename or '\\' in filename:
            raise HTTPException(status_code=400, detail="Invalid filename")
        
        image_path = os.path.join("..", "other_image", filename)
        
        if not os.path.exists(image_path):
            raise HTTPException(status_code=404, detail="Image not found")
        
        return FileResponse(image_path)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/share-to-slack")
async def share_to_slack(
    channel: str = Form(...),
    message: str = Form(...),
    screenshot: UploadFile = File(...)
):
    """
    Slackにガチャ結果のスクリーンショットを共有
    """
    try:
        import subprocess
        import json
        
        # 環境変数からSlack設定を取得
        slack_webhook_url = os.getenv("SLACK_WEBHOOK_URL")
        slack_bot_icon = os.getenv("SLACK_BOT_ICON_URL", "")
        
        if not slack_webhook_url:
            raise HTTPException(status_code=400, detail="Slack Webhook URLが設定されていません。env/.envファイルでSLACK_WEBHOOK_URLを設定してください。")
        
        # スクリーンショットを一時保存
        screenshot_id = str(uuid.uuid4())
        screenshot_path = os.path.join(UPLOAD_DIR, f"slack_screenshot_{screenshot_id}.png")
        
        with open(screenshot_path, "wb") as buffer:
            shutil.copyfileobj(screenshot.file, buffer)
        
        print(f"スクリーンショットを一時保存: {screenshot_path}")
        
        # TODO: 実際のSlack APIではファイルアップロードが必要
        # 現在はテキストメッセージのみ送信（スクリーンショット機能は後で実装）
        
        # Slackにメッセージを送信
        curl_command = [
            'curl', slack_webhook_url,
            '--data', f'channel={channel}',
            '--data', 'username=hirsakam_icon_generator_bot',
            '--data', f'text={message}',
            '--data', f'icon_url={slack_bot_icon}',
            '--data', 'link_names=true'
        ]
        
        print(f"Slack送信コマンド: {' '.join(curl_command)}")
        
        # curlコマンドを実行
        result = subprocess.run(
            curl_command,
            capture_output=True,
            text=True,
            timeout=30
        )
        
        # 一時ファイルを削除
        if os.path.exists(screenshot_path):
            os.remove(screenshot_path)
            print(f"一時ファイルを削除: {screenshot_path}")
        
        if result.returncode == 0:
            print(f"Slack送信成功: {result.stdout}")
            return {
                "success": True,
                "message": "Slackに正常に送信されました",
                "channel": channel,
                "response": result.stdout
            }
        else:
            print(f"Slack送信失敗: {result.stderr}")
            raise HTTPException(
                status_code=500, 
                detail=f"Slack送信に失敗しました: {result.stderr}"
            )
            
    except subprocess.TimeoutExpired:
        # タイムアウト時も一時ファイルを削除
        if 'screenshot_path' in locals() and os.path.exists(screenshot_path):
            os.remove(screenshot_path)
        raise HTTPException(status_code=500, detail="Slack送信がタイムアウトしました")
    except Exception as e:
        # エラー時も一時ファイルを削除
        if 'screenshot_path' in locals() and os.path.exists(screenshot_path):
            os.remove(screenshot_path)
        print(f"Slack送信エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # ファイルアップロードサイズ制限を5MBに設定
    server_url = os.getenv("SERVER_URL", "http://localhost")
    
    # 起動メッセージをカスタマイズ
    print(f"🚀 FastAPI サーバーを起動しています...")
    if server_url != "http://localhost":
        print(f"🌐 サーバーURL: {server_url}:8000")
    else:
        print(f"🏠 ローカル開発環境: {server_url}:8000")
    
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        # リクエストサイズ制限を5MB（5 * 1024 * 1024 bytes）に設定
        limit_max_requests=1000,
        timeout_keep_alive=30,
        # uvicornのログレベルを設定（WARNINGにしてINFOログを減らす）
        log_level="warning"
    )