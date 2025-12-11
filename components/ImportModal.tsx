import React, { useState } from 'react';
import { useApp } from '../context';
import { DICTIONARY } from '../constants';
import { parseCSV } from '../utils';
import { X, Upload, AlertCircle } from 'lucide-react';

interface ImportModalProps {
  onClose: () => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ onClose }) => {
  const { language, importTasks } = useApp();
  const t = DICTIONARY[language];
  const [importText, setImportText] = useState('');

  const handleImport = () => {
    if (!importText) return;
    const newTasks = parseCSV(importText);
    const tasksWithId = newTasks.map((t, idx) => ({
        ...t,
        id: `imported-${Date.now()}-${idx}`,
        status: 'pending' as const
    }));
    // @ts-ignore
    importTasks(tasksWithId);
    onClose();
    alert(`${tasksWithId.length} ${t.importSuccess}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold dark:text-white">{t.import}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm mb-4 flex gap-2">
              <AlertCircle size={20} className="flex-shrink-0" />
              <div>
                <p className="font-semibold mb-1">{t.instruction}</p>
                {t.uploadInstruction}
                <div className="mt-2 font-mono text-xs opacity-80">
                  {t.csvExample}
                </div>
              </div>
          </div>
          
          <textarea 
              className="w-full h-64 border rounded-lg p-3 text-sm font-mono bg-gray-50 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-zte-blue outline-none"
              placeholder={t.pasteCsvPlaceholder}
              value={importText}
              onChange={e => setImportText(e.target.value)}
          />
        </div>

        <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded transition-colors">
            {t.cancel}
          </button>
          <button 
            onClick={handleImport}
            className="px-6 py-2 bg-zte-blue text-white rounded font-medium hover:bg-zte-dark transition-colors flex items-center gap-2"
          >
            <Upload size={18} /> {t.importBtn}
          </button>
        </div>
      </div>
    </div>
  );
};