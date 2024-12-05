from fastapi import FastAPI, File, UploadFile, HTTPException, Response
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import openpyxl
from openpyxl.styles import PatternFill
import pandas as pd
import numpy as np
from datetime import datetime
import os
import shutil
import tempfile
import logging
import json
import traceback
import zipfile
from pathlib import Path
import sys

# Настройка логирования
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Логируем информацию о запуске
logger.info("=== Starting OFD Converter Backend ===")
logger.info(f"Python Version: {sys.version}")
logger.info(f"Current Directory: {os.getcwd()}")
logger.info(f"Directory Contents: {os.listdir('.')}")

# Логируем только важные переменные окружения
env_vars = {
    "VERCEL_ENV": os.getenv("VERCEL_ENV", "local"),
    "VERCEL_REGION": os.getenv("VERCEL_REGION", "unknown"),
    "PYTHON_VERSION": sys.version,
    "TEMP_DIR": tempfile.gettempdir()
}
logger.info(f"Environment Info: {json.dumps(env_vars, indent=2)}")

app = FastAPI()

# Настройка CORS
origins = [
    "http://localhost:3000",
    "https://ofd-converter.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

@app.get("/api")
async def root():
    logger.info("Root endpoint called")
    return {
        "status": "Backend is running",
        "timestamp": datetime.now().isoformat(),
        "environment": os.getenv("VERCEL_ENV", "local")
    }

@app.get("/api/health")
async def health_check():
    """Подробная проверка состояния бэкенда"""
    logger.info("Health check endpoint called")
    
    # Проверяем доступ к временной директории
    temp_dir = tempfile.gettempdir()
    temp_writable = os.access(temp_dir, os.W_OK)
    
    # Проверяем наличие всех необходимых пакетов
    required_packages = ['pandas', 'numpy', 'openpyxl']
    packages_status = {}
    for package in required_packages:
        try:
            module = __import__(package)
            packages_status[package] = getattr(module, '__version__', 'installed')
        except ImportError as e:
            packages_status[package] = f"ERROR: {str(e)}"
    
    # Собираем информацию о системе
    system_info = {
        "python_version": sys.version,
        "platform": sys.platform,
        "cwd": os.getcwd(),
        "temp_dir": temp_dir,
        "temp_dir_writable": temp_writable,
        "dir_contents": os.listdir('.'),
        "packages": packages_status,
        "environment": os.getenv("VERCEL_ENV", "local"),
        "vercel_region": os.getenv("VERCEL_REGION"),
        "memory_limit": os.getenv("AWS_LAMBDA_FUNCTION_MEMORY_SIZE"),
        "function_name": os.getenv("AWS_LAMBDA_FUNCTION_NAME"),
        "timestamp": datetime.now().isoformat()
    }
    
    logger.info(f"Health check response: {json.dumps(system_info, indent=2)}")
    return system_info

# Константы
PAYMENT_COLUMNS = ['Наличными', 'Электронными', 'Предоплата (аванс)', 'Зачет предоплаты (аванса)']
HIGHLIGHT_COLOR = 'D3D3D3'  # Светло-серый цвет для итоговых строк

# Определяем путь к временной директории
TEMP_DIR = "/tmp" if os.path.exists("/tmp") else "temp_files"
if not os.path.exists(TEMP_DIR):
    os.makedirs(TEMP_DIR)

def process_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Обработка данных согласно требованиям"""
    # 3. Сортировка по дате
    df['Дата/время'] = pd.to_datetime(df['Дата/время'])
    df = df.sort_values('Дата/время')
    
    # 1. Обработка возвратов
    return_mask = df['Признак расчета'] == 'Возврат прихода'
    for col in PAYMENT_COLUMNS:
        df.loc[return_mask, col] = -abs(df[col].fillna(0))
    
    # 2. Расчет итогов
    df['Итого'] = df[PAYMENT_COLUMNS].sum(axis=1)
    
    return df

def add_daily_totals(df: pd.DataFrame, writer: pd.ExcelWriter, sheet_name: str):
    """Добавление ежедневных итогов с форматированием"""
    # Создаем копию для обработки
    df_with_totals = []
    
    # Группируем по дате для подсчета итогов
    for date, group in df.groupby(df['Дата/время'].dt.date):
        # Добавляем строки группы
        df_with_totals.append(group)
        
        # Создаем строку с итогами
        totals = pd.DataFrame([{
            'Дата/время': group['Дата/время'].iloc[-1],
            'Признак расчета': 'ИТОГО за день',
            **{col: group[col].sum() for col in PAYMENT_COLUMNS + ['Итого']}
        }])
        df_with_totals.append(totals)
    
    # Объединяем все в один DataFrame
    result_df = pd.concat(df_with_totals, ignore_index=True)
    
    # Записываем в Excel
    result_df.to_excel(writer, sheet_name=sheet_name, index=False)
    
    # Получаем лист для форматирования
    worksheet = writer.sheets[sheet_name]
    
    # Форматируем итоговые строки
    for row_idx, row in enumerate(worksheet.iter_rows(min_row=2), start=2):
        if row[1].value == 'ИТОГО за день':  # Признак расчета
            for cell in row:
                cell.fill = PatternFill(start_color=HIGHLIGHT_COLOR, end_color=HIGHLIGHT_COLOR, fill_type='solid')

@app.post("/api/process_excel")
async def process_excel(file: UploadFile = File(...)):
    temp_path = None
    output_files = []
    archive_name = None
    
    try:
        logger.info(f"Получен файл: {file.filename}")
        
        # Проверка расширения файла
        if not file.filename.endswith('.xlsx'):
            raise HTTPException(status_code=400, detail="Only .xlsx files are allowed")

        # Генерируем уникальные имена файлов
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        temp_path = os.path.join(TEMP_DIR, f"temp_{timestamp}_{file.filename}")
        
        # Сохраняем входной файл
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        logger.info("File saved successfully")

        # Читаем Excel файл
        logger.info("Reading Excel file")
        df = pd.read_excel(temp_path)
        logger.info(f"DataFrame shape: {df.shape}")

        # Проверяем наличие необходимых колонок
        required_columns = ['Дата/время', 'Признак расчета', 'Тип налогообложения']
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )

        # Обрабатываем данные
        logger.info("Processing data")
        df = process_dataframe(df)
        
        # 4. Разделяем на два файла по типу налогообложения
        for tax_type in ['ПАТЕНТ', 'УСН']:
            df_tax = df[df['Тип налогообложения'].str.contains(tax_type, case=False, na=False)].copy()
            if not df_tax.empty:
                output_filename = os.path.join(TEMP_DIR, f"processed_{tax_type}_{timestamp}_{file.filename}")
                with pd.ExcelWriter(output_filename, engine='openpyxl') as writer:
                    add_daily_totals(df_tax, writer, f'{tax_type}')
                output_files.append(output_filename)
        
        # Проверяем, что файлы созданы
        if not output_files:
            raise Exception("Не удалось создать выходные файлы")
        
        # Создаем архив с результатами
        archive_name = os.path.join(TEMP_DIR, f"results_{timestamp}.zip")
        logger.info(f"Creating ZIP archive: {archive_name}")
        
        with zipfile.ZipFile(archive_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for f in output_files:
                if os.path.exists(f):
                    zipf.write(f, os.path.basename(f))
                else:
                    logger.error(f"Файл {f} не найден при создании архива")
        
        # Проверяем, что архив создан
        if not os.path.exists(archive_name):
            raise Exception("Не удалось создать архив с результатами")
        
        logger.info("Processing completed successfully")
        
        # Читаем архив в память
        with open(archive_name, 'rb') as f:
            file_data = f.read()
        
        # Удаляем временные файлы
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
        for f in output_files:
            if os.path.exists(f):
                os.remove(f)
        if archive_name and os.path.exists(archive_name):
            os.remove(archive_name)
        
        # Возвращаем архив с правильными заголовками
        return Response(
            content=file_data,
            media_type='application/zip',
            headers={
                'Content-Disposition': f'attachment; filename="results_{timestamp}.zip"',
                'Content-Type': 'application/zip'
            }
        )
    
    except Exception as e:
        logger.error(f"Error processing file: {str(e)}", exc_info=True)
        # В случае ошибки очищаем все файлы
        try:
            if temp_path and os.path.exists(temp_path):
                os.remove(temp_path)
            for f in output_files:
                if os.path.exists(f):
                    os.remove(f)
            if archive_name and os.path.exists(archive_name):
                os.remove(archive_name)
        except Exception as cleanup_error:
            logger.error(f"Error cleaning up files: {str(cleanup_error)}")
        
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("shutdown")
async def cleanup_temp_files():
    """Очистка временных файлов при выключении сервера"""
    if os.path.exists(TEMP_DIR):
        try:
            shutil.rmtree(TEMP_DIR)
            logger.info("Временная директория очищена")
        except Exception as e:
            logger.error(f"Ошибка при очистке временной директории: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting server")
    uvicorn.run(app, host="0.0.0.0", port=8000)
