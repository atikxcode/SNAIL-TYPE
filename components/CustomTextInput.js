// components/CustomTextInput.js
'use client';

import { useState, useEffect } from 'react';
import { addCustomText, getUserCustomTexts } from '@/lib/services/textContentService';
import { useAuth } from '@/lib/hooks/useAuth';

const CustomTextInput = ({ onCustomTextSelect, onClose }) => {
  const { user } = useAuth();
  const [customText, setCustomText] = useState('');
  const [textName, setTextName] = useState('');
  const [savedTexts, setSavedTexts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedSavedText, setSelectedSavedText] = useState('');

  useEffect(() => {
    if (user) {
      loadUserCustomTexts();
    }
  }, [user]);

  const loadUserCustomTexts = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const result = await getUserCustomTexts(user.uid);
      if (result.success) {
        setSavedTexts(result.customTexts || []);
      } else {
        setError(result.error || 'Failed to load saved texts');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!customText.trim()) {
      setError('Please enter some text to save');
      return;
    }

    if (!user) {
      setError('Please sign in to save custom texts');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const result = await addCustomText(user.uid, customText, textName || 'Custom Text');

      if (result.success) {
        setSuccess('Custom text saved successfully!');
        setTextName('');
        setCustomText('');
        // Reload saved texts after saving
        await loadUserCustomTexts();
      } else {
        setError(result.error || 'Failed to save text');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUseCustomText = () => {
    if (selectedSavedText) {
      // Find the selected text in saved texts
      const selectedTextObj = savedTexts.find(text => text._id.toString() === selectedSavedText);
      if (selectedTextObj) {
        onCustomTextSelect(selectedTextObj.text);
        return;
      }
    }
    if (customText.trim()) {
      onCustomTextSelect(customText);
    }
  };

  const handleTextChange = (e) => {
    const text = e.target.value;
    setCustomText(text);

    // Auto-generate a name if none is provided and field is empty
    if (!textName && text.length > 0) {
      const firstLine = text.split('\n')[0].trim();
      const autoName = firstLine.substring(0, 30) + (firstLine.length > 30 ? '...' : '');
      setTextName(autoName);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Custom Text Input</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {!user && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-200 rounded text-yellow-700">
            Sign in to save custom texts for future use
          </div>
        )}

        {/* Input for new custom text */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="mb-4">
            <label htmlFor="textName" className="block text-sm font-medium mb-1">
              Name (optional)
            </label>
            <input
              type="text"
              id="textName"
              value={textName}
              onChange={(e) => setTextName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
              placeholder="Auto-generated from text..."
            />
          </div>

          <div className="mb-4">
            <label htmlFor="customText" className="block text-sm font-medium mb-1">
              Enter your custom text
            </label>
            <textarea
              id="customText"
              value={customText}
              onChange={handleTextChange}
              rows={6}
              className="w-full p-3 border border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
              placeholder="Paste or type your custom text here..."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={loading || !user}
              className={`px-4 py-2 rounded ${
                user
                  ? 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? 'Saving...' : 'Save Text'}
            </button>

            <button
              type="button"
              onClick={handleUseCustomText}
              disabled={loading || (!customText.trim() && !selectedSavedText)}
              className={`px-4 py-2 rounded ${
                (customText.trim() || selectedSavedText)
                  ? 'bg-green-500 text-white hover:bg-green-600 disabled:opacity-50'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Use This Text
            </button>
          </div>
        </form>

        {/* Status messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-200 rounded text-green-700">
            {success}
          </div>
        )}

        {/* Saved texts (if user is authenticated) */}
        {user && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Your Saved Texts</h3>

            {loading ? (
              <p>Loading saved texts...</p>
            ) : savedTexts.length > 0 ? (
              <div className="space-y-3">
                {savedTexts.map((textItem) => (
                  <div key={textItem._id ? textItem._id.toString() : Math.random()} className="border border-gray-200 rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">{textItem.category || 'Custom Text'}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                          {textItem.text ? textItem.text.substring(0, 100) + (textItem.text.length > 100 ? '...' : '') : ''}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {textItem.createdAt ? new Date(textItem.createdAt).toLocaleDateString() : ''}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="selectedText"
                          value={textItem._id ? textItem._id.toString() : ''}
                          checked={selectedSavedText === (textItem._id ? textItem._id.toString() : '')}
                          onChange={() => setSelectedSavedText(textItem._id ? textItem._id.toString() : '')}
                          className="mt-1"
                        />
                        <button
                          onClick={() => {
                            setSelectedSavedText(textItem._id ? textItem._id.toString() : '');
                            setCustomText(textItem.text || '');
                            setTextName(textItem.category || '');
                          }}
                          className="text-blue-500 hover:text-blue-700 text-sm"
                        >
                          Load
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {selectedSavedText && (
                  <button
                    onClick={handleUseCustomText}
                    className="w-full mt-3 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Use Selected Text
                  </button>
                )}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-300">No saved custom texts yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomTextInput;