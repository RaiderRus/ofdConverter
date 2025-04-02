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
      const response = await fetch('/api/process_bill', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Ошибка при обработке файла');
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
      message.error('Ошибка при обработке файла');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px' }}>
      <h2>Преобразование электронных счетов</h2>
      <p>Загрузите XML файл электронного счета для преобразования в формат 1С</p>
      <Upload
        accept=".xml"
        showUploadList={false}
        beforeUpload={beforeUpload}
        customRequest={({ file }) => handleUpload(file as RcFile)}
      >
        <Button icon={<UploadOutlined />} loading={loading}>
          Выберите файл
        </Button>
      </Upload>
    </div>
  );
};

export default BillConverter; 