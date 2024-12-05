'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const progressInterval = useRef<NodeJS.Timeout>();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false
  });

  const simulateProgress = () => {
    setProgress(0);
    progressInterval.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval.current);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 500);
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Пожалуйста, выберите файл');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      simulateProgress();

      const formData = new FormData();
      formData.append("file", file);

      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ofd-converter.vercel.app';
      const response = await fetch(`${BASE_URL}/api/process_excel`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Ошибка при обработке файла');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'processed_' + file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setProgress(100);
      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
        setFile(null);
      }, 1000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      clearInterval(progressInterval.current);
      if (!error) {
        setTimeout(() => setIsLoading(false), 1000);
      } else {
        setIsLoading(false);
      }
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            OFD Конвертер
          </h1>
          <p className="text-gray-600 text-lg">
            Загрузите Excel файл для обработки
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 animate-slide-up">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
              isDragActive
                ? 'border-blue-500 bg-blue-50 scale-102'
                : 'border-gray-300 hover:border-blue-400'
            }`}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <div className="text-6xl mb-4 transition-transform duration-300 hover:scale-110">
                📄
              </div>
              {isDragActive ? (
                <p className="text-blue-500 font-medium">Отпустите файл здесь...</p>
              ) : (
                <div>
                  <p className="text-gray-600 mb-2">
                    Перетащите файл сюда или нажмите для выбора
                  </p>
                  <p className="text-gray-400 text-sm">
                    Поддерживаются файлы .xlsx и .xls
                  </p>
                </div>
              )}
            </div>
          </div>

          {file && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg flex items-center justify-between animate-fade-in">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📎</span>
                <span className="text-gray-700 font-medium truncate">
                  {file.name}
                </span>
              </div>
              <button
                onClick={() => setFile(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 animate-shake">
            {error}
          </div>
        )}

        <div className="flex justify-center animate-fade-in">
          <button
            onClick={handleSubmit}
            disabled={!file || isLoading}
            className={`
              px-8 py-3 rounded-full font-medium text-white
              transition-all duration-300 transform hover:scale-105
              ${
                !file || isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
              }
            `}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <span className="animate-spin">⚙️</span>
                <span>Обработка...</span>
              </div>
            ) : (
              'Обработать файл'
            )}
          </button>
        </div>

        {isLoading && (
          <div className="mt-8 animate-fade-in">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-center text-gray-600 mt-2">
              {progress.toFixed(0)}%
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
