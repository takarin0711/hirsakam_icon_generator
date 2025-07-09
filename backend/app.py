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
app.mount("/static", StaticFiles(directory=".."), name="static")

@app.get("/default-image")
async def get_default_image():
    """デフォルトのhirsakam.jpg画像を提供"""
    hirsakam_path = os.path.join("..", "hirsakam.jpg")
    if os.path.exists(hirsakam_path):
        return FileResponse(hirsakam_path, media_type="image/jpeg")
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
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type='image/jpeg'
    )

@app.get("/gallery")
async def get_gallery(sort: str = "desc"):
    """
    生成済みの画像一覧を取得
    Args:
        sort: ソート順 ("asc" = 古い順, "desc" = 新しい順, デフォルト: desc)
    """
    try:
        output_dir = os.path.join("..", "output")
        if not os.path.exists(output_dir):
            return {"images": []}
        
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
        
        # created_atフィールドを除去（フロントエンドには不要）
        for image in images:
            del image["created_at"]
        
        return {"images": images}
        
    except Exception as e:
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