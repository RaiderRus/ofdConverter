"use client";

import React, { useState, ChangeEvent, FormEvent } from 'react';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
    setError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    
    if (!file) {
      setError("Пожалуйста, выберите файл");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ofd-converter.vercel.app';
      const response = await fetch(`${API_URL}/process_excel`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Произошла ошибка при обработке файла');
      }

      // Получаем blob данные
      const blob = await response.blob();
      
      // Создаем ссылку для скачивания
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `processed_${file.name}`;
      
      // Запускаем скачивание
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Очищаем URL
      window.URL.revokeObjectURL(downloadUrl);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при обработке файла');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Загрузка Excel файла</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex flex-col gap-4">
          <input 
            type="file" 
            accept=".xlsx" 
            onChange={handleFileChange} 
            className="border p-2 rounded"
          />
          <button 
            type="submit" 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
            disabled={loading}
          >
            {loading ? 'Обработка...' : 'Загрузить и обработать'}
          </button>
        </div>
      </form>
      
      {error && (
        <div className="text-red-500 mb-4">
          {error}
        </div>
      )}
    </main>
  );
}
