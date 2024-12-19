'use client';
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportType, setReportType] = useState<'checks' | 'nomenclature'>('checks');

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setError(null);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      setError('Пожалуйста, загрузите файл Excel (.xlsx)');
      return;
    }
    setFile(droppedFile);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        setError('Пожалуйста, загрузите файл Excel (.xlsx)');
        return;
      }
      setFile(selectedFile);
    }
  }, []);

  const handleSubmit = async () => {
    if (!file) {
      setError('Пожалуйста, выберите файл');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("report_type", reportType);

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
      // Меняем расширение на .zip
      const baseFileName = file.name.replace('.xlsx', '');
      a.download = `processed_${baseFileName}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto"
      >
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          OFD Конвертер
        </h1>
        
        <motion.div
          className="bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700"
          whileHover={{ scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
            <div className="relative py-3 sm:max-w-xl sm:mx-auto">
              <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
                <div className="max-w-md mx-auto">
                  <div className="divide-y divide-gray-200">
                    <div className="py-8 text-base leading-6 space-y-4 text-gray-700 sm:text-lg sm:leading-7">
                      <h2 className="text-2xl font-bold mb-8 text-center text-gray-900">Конвертер OFD</h2>
                      
                      <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2">
                          Выберите тип отчета:
                        </label>
                        <select
                          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                          value={reportType}
                          onChange={(e) => setReportType(e.target.value as 'checks' | 'nomenclature')}
                        >
                          <option value="checks">Отчет по чекам</option>
                          <option value="nomenclature">Отчет по номенклатуре</option>
                        </select>
                      </div>

                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-lg p-12 ${
                          file ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <motion.div
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          {file ? (
                            <p className="text-green-400">Выбран файл: {file.name}</p>
                          ) : (
                            <div>
                              <p className="text-gray-300 mb-4">
                                Перетащите файл Excel сюда или нажмите для выбора
                              </p>
                              <input
                                type="file"
                                accept=".xlsx"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="file-input"
                              />
                              <motion.label
                                htmlFor="file-input"
                                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                Выбрать файл
                              </motion.label>
                            </div>
                          )}
                        </motion.div>
                      </div>

                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm"
                        >
                          {error}
                        </motion.div>
                      )}

                      {file && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-6 flex justify-center"
                        >
                          <motion.button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`px-6 py-3 bg-green-600 text-white rounded-lg font-medium
                              ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'}`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {loading ? (
                              <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Обработка...
                              </span>
                            ) : (
                              'Обработать файл'
                            )}
                          </motion.button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </main>
  );
}
