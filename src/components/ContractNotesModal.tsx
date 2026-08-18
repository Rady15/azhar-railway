import React, { useState } from 'react';
import { X, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { Contract, ContractNote } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ContractNotesModalProps {
  contract: Contract | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveNotes: (contractId: string, notes: ContractNote[]) => void;
}

export const ContractNotesModal: React.FC<ContractNotesModalProps> = ({
  contract,
  isOpen,
  onClose,
  onSaveNotes
}) => {
  const { language } = useLanguage();
  const [notes, setNotes] = useState<ContractNote[]>(() => contract?.notes || []);
  const [newNoteText, setNewNoteText] = useState('');

  if (!isOpen || !contract) return null;

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newNote: ContractNote = {
      id: String(Date.now()),
      date: new Date().toISOString().split('T')[0],
      author: 'Property Manager',
      text: newNoteText.trim()
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    onSaveNotes(contract.id, updated);
    setNewNoteText('');
  };

  const handleDeleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    onSaveNotes(contract.id, updated);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 my-auto">
        {/* Header */}
        <div className="bg-[#2b62af] px-6 py-3.5 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-cyan-300" />
            <h3 className="text-sm font-bold">
              {language === 'ar' ? `ملاحظات العقد - وحدة ${contract.unitNumber}` : `Contract Notes - Unit ${contract.unitNumber}`}
            </h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs text-slate-800">
          <form onSubmit={handleAddNote} className="flex gap-2">
            <input
              type="text"
              placeholder={language === 'ar' ? 'أدخل ملاحظة جديدة...' : 'Type a new note...'}
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#2b62af] focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#2b62af] hover:bg-[#224f8d] text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {language === 'ar' ? 'إضافة' : 'Add'}
            </button>
          </form>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {notes.length === 0 ? (
              <p className="text-center text-slate-400 py-6">
                {language === 'ar' ? 'لا توجد ملاحظات مسجلة لهذا العقد.' : 'No notes recorded for this contract.'}
              </p>
            ) : (
              notes.map((n) => (
                <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-3 text-start">
                  <div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-0.5 font-mono">
                      <span className="font-semibold text-slate-700">{n.author}</span>
                      <span>•</span>
                      <span>{n.date}</span>
                    </div>
                    <p className="text-slate-800 font-medium">{n.text}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteNote(n.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl"
          >
            {language === 'ar' ? 'تم' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};
