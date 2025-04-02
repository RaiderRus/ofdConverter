'use client';

import React, { useState } from 'react';
import { Upload, message, Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { RcFile } from 'antd/lib/upload';

const BillConverter: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const beforeUpload = (file: RcFile) => {
    const isXML = file.type === 'text/xml' || file.name.toLowerCase().endsWith('.xml');
    if (!isXML) {
      message.error('Можно загружать только XML файлы!');
    }
    return isXML;
  };

  const handleUpload = async (file: RcFile) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
        (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : 'https://ofd-converter.vercel.app');

      const response = await fetch(`${BASE_URL}/api/process_bill`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Ошибка при обработке файла');
      }

      // Получаем имя файла из заголовка Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : 'processed_bill.zip';

      // Скачиваем файл
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      message.success('Файл успешно обработан!');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Ошибка при обработке файла');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-gray-800 rounded-xl shadow-2xl p-8 mt-8">
      <div className="text-center space-y-8">
        <div>
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Преобразование электронных счетов
          </h2>
          <p className="text-gray-400">
            Загрузите XML файл для обработки
          </p>
        </div>

        <Upload
          accept=".xml"
          showUploadList={false}
          beforeUpload={beforeUpload}
          customRequest={({ file }) => handleUpload(file as RcFile)}
        >
          <Button 
            icon={<UploadOutlined />} 
            loading={loading}
            className="w-full h-32 flex items-center justify-center border-2 border-dashed border-gray-600 hover:border-blue-500 bg-gray-700/50 hover:bg-gray-700"
          >
            {loading ? 'Обработка...' : 'Нажмите или перетащите файл сюда'}
          </Button>
        </Upload>
      </div>
    </div>
  );
};

export default BillConverter;