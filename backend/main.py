from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse, FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
import openpyxl
from openpyxl.styles import PatternFill
import pandas as pd
from datetime import datetime
import os
import shutil
from typing import Union, List
from fastapi.encoders import jsonable_encoder
import logging
import traceback
import zipfile
from pathlib import Path

# Настройка логирования
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Константы
PAYMENT_COLUMNS = ['Наличными', 'Электронными', 'Предоплата (аванс)', 'Зачет предоплаты (аванса)']
HIGHLIGHT_COLOR = 'D3D3D3'  # Светло-серый цвет для итоговых строк

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Создаем временную директорию при запуске сервера
TEMP_DIR = "temp_files"
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

@app.post("/process_excel/")
async def process_excel(file: UploadFile = File(...)):
    temp_path = None
    output_files = []
    archive_name = None
    
    try:
        logger.info(f"Получен файл: {file.filename}")
        
        if not file.filename.endswith('.xlsx'):
            return JSONResponse(
                status_code=400,
                content={"error": "Файл должен быть в формате .xlsx"}
            )

        # Генерируем уникальные имена файлов
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        temp_path = os.path.join(TEMP_DIR, f"temp_{timestamp}_{file.filename}")
        
        # Сохраняем входной файл
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Читаем Excel файл
        df = pd.read_excel(temp_path)
        logger.info(f"Доступные колонки в файле: {df.columns.tolist()}")
        
        # Обрабатываем данные
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
        with zipfile.ZipFile(archive_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for f in output_files:
                if os.path.exists(f):
                    zipf.write(f, os.path.basename(f))
                else:
                    logger.error(f"Файл {f} не найден при создании архива")
        
        # Проверяем, что архив создан
        if not os.path.exists(archive_name):
            raise Exception("Не удалось создать архив с результатами")
        
        logger.info("Отправка архива клиенту")
        
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
        logger.error(f"Ошибка при обработке файла: {str(e)}")
        logger.error(traceback.format_exc())
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
            logger.error(f"Ошибка при очистке файлов: {str(cleanup_error)}")
        
        return JSONResponse(
            status_code=500,
            content={"error": f"Ошибка при обработке файла: {str(e)}"}
        )

@app.on_event("shutdown")
async def cleanup_temp_files():
    """Очистка временных файлов при выключении сервера"""
    if os.path.exists(TEMP_DIR):
        try:
            shutil.rmtree(TEMP_DIR)
            logger.info("Временная директория очищена")
        except Exception as e:
            logger.error(f"Ошибка при очистке временной директории: {str(e)}")
