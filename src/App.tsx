import React, { useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import { Brain, Loader2, FileUp, Link } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configurar el worker de PDF.js para usar la versión local
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

type InputType = 'text' | 'file' | 'url';

// Función para agregar proxy CORS a la URL
const addCorsProxy = (url: string): string => {
  return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
};

function App() {
  const [inputType, setInputType] = useState<InputType>('text');
  const [inputText, setInputText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [embeddings, setEmbeddings] = useState<number[] | null>(null);

  const isValidUrl = (urlString: string): boolean => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const processUrl = async (url: string) => {
    if (!isValidUrl(url)) {
      setError('URL inválida. Por favor, ingrese una URL completa que comience con http:// o https://');
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const proxyUrl = addCorsProxy(url);
      const response = await fetch(proxyUrl, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Error al obtener el contenido: ${response.statusText}`);
      }

      const text = await response.text();
      await processText(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la URL');
    } finally {
      setProcessing(false);
    }
  };

  const processFile = async (file: File) => {
    setProcessing(true);
    setError(null);
    try {
      let text = '';
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: any) => item.str).join(' ') + '\n';
        }
      } else {
        text = await file.text();
      }
      await processText(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el archivo');
    } finally {
      setProcessing(false);
    }
  };

  const processText = async (text: string) => {
    try {
      // Aquí iría la lógica para generar embeddings con TensorFlow.js
      const tensor = tf.tensor([Array.from(text).map(char => char.charCodeAt(0))]);
      const normalized = tf.div(tensor, 255);
      const embeddings = await normalized.array();
      setEmbeddings(embeddings[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar embeddings');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmbeddings(null);

    if (!inputText.trim()) {
      setError('Por favor, ingrese algún texto para procesar');
      return;
    }

    switch (inputType) {
      case 'text':
        await processText(inputText);
        break;
      case 'url':
        await processUrl(inputText);
        break;
      default:
        setError('Tipo de entrada no válido');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const getInputTypeLabel = (type: InputType): string => {
    switch (type) {
      case 'text':
        return 'Texto';
      case 'file':
        return 'Archivo';
      case 'url':
        return 'URL';
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center mb-8">
          <Brain className="w-12 h-12 text-blue-400 mr-4" />
          <h1 className="text-4xl font-bold">Generador de Embeddings</h1>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
          <div className="flex space-x-4 mb-6">
            {(['text', 'file', 'url'] as InputType[]).map((type) => (
              <button
                key={type}
                onClick={() => setInputType(type)}
                className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                  inputType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {type === 'text' && <Brain className="w-4 h-4 mr-2" />}
                {type === 'file' && <FileUp className="w-4 h-4 mr-2" />}
                {type === 'url' && <Link className="w-4 h-4 mr-2" />}
                {getInputTypeLabel(type)}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {inputType === 'file' ? (
              <input
                type="file"
                accept=".txt,.pdf"
                onChange={handleFileChange}
                className="w-full p-2 bg-gray-700 rounded-md"
              />
            ) : (
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={
                  inputType === 'text'
                    ? 'Ingrese el texto para generar embeddings...'
                    : 'Ingrese la URL del documento...'
                }
                className="w-full h-32 p-4 bg-gray-700 rounded-md text-white placeholder-gray-400 resize-none"
              />
            )}

            {!processing && inputType !== 'file' && (
              <button
                type="submit"
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
              >
                Generar Embeddings
              </button>
            )}
          </form>

          {processing && (
            <div className="flex items-center justify-center space-x-2 mt-4">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Procesando...</span>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-600/20 border border-red-600 rounded-md text-red-200">
              {error}
            </div>
          )}

          {embeddings && (
            <div className="mt-6 p-4 bg-gray-700 rounded-md">
              <h3 className="text-xl font-semibold mb-2">Embeddings Generados</h3>
              <p className="text-gray-300">Dimensiones: {embeddings.length}</p>
              <div className="mt-2">
                <p className="text-sm text-gray-400">Primeros 5 valores:</p>
                <pre className="mt-1 p-2 bg-gray-800 rounded overflow-x-auto">
                  {JSON.stringify(embeddings.slice(0, 5), null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;