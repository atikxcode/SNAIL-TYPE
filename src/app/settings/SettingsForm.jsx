'use client';

import React from 'react';
import { useTypingStore } from '../../lib/stores/typingStore';

export default function SettingsForm() {
    const { settings, updateSettings } = useTypingStore();

    const handleChange = (key, value) => {
        updateSettings({ [key]: value });
    };

    return (
        <div className="space-y-8">
            {/* Visual Settings */}
            <section>
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Visuals</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Theme */}
                    <div className="flex flex-col">
                        <label className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Theme</label>
                        <select
                            value={settings.theme}
                            onChange={(e) => handleChange('theme', e.target.value)}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                            <option value="system">System</option>
                        </select>
                    </div>

                    {/* Caret Style */}
                    <div className="flex flex-col">
                        <label className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Caret Style</label>
                        <select
                            value={settings.caretStyle}
                            onChange={(e) => handleChange('caretStyle', e.target.value)}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="smooth">Smooth</option>
                            <option value="block">Block</option>
                            <option value="line">Line</option>
                            <option value="underline">Underline</option>
                        </select>
                    </div>

                    {/* Font Family */}
                    <div className="flex flex-col">
                        <label className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Font Family</label>
                        <select
                            value={settings.fontFamily}
                            onChange={(e) => handleChange('fontFamily', e.target.value)}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="monospace">Monospace</option>
                            <option value="sans">Sans-serif</option>
                            <option value="serif">Serif</option>
                        </select>
                    </div>

                    {/* Font Size */}
                    <div className="flex flex-col">
                        <label className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Font Size</label>
                        <select
                            value={settings.fontSize}
                            onChange={(e) => handleChange('fontSize', e.target.value)}
                            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                            <option value="xl">Extra Large</option>
                        </select>
                    </div>
                </div>
            </section>

            {/* Sound Settings */}
            <section>
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Sound</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Typewriter Sounds</label>
                        <input
                            type="checkbox"
                            checked={settings.typewriterSounds}
                            onChange={(e) => handleChange('typewriterSounds', e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-700 border-gray-300"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Error Sound</label>
                        <input
                            type="checkbox"
                            checked={settings.errorSound}
                            onChange={(e) => handleChange('errorSound', e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-700 border-gray-300"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Completion Sound</label>
                        <input
                            type="checkbox"
                            checked={settings.completionSound}
                            onChange={(e) => handleChange('completionSound', e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-700 border-gray-300"
                        />
                    </div>

                    {/* Volume Slider */}
                    <div className="flex flex-col mt-2">
                        <div className="flex justify-between mb-1">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Volume</label>
                            <span className="text-sm text-gray-500 dark:text-gray-400">{settings.volume}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={settings.volume}
                            onChange={(e) => handleChange('volume', parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                    </div>
                </div>
            </section>

            {/* Gameplay / Mode Settings */}
            <section>
                <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Typing Mode</h2>
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Strict Mode</label>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Fail word immediately on mistake</span>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.strictMode}
                            onChange={(e) => handleChange('strictMode', e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-700 border-gray-300"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Restart</label>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Press 'Tab' to restart test</span>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.quickRestart}
                            onChange={(e) => handleChange('quickRestart', e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-700 border-gray-300"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Confidence Mode</label>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Cannot backspace</span>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.confidenceMode}
                            onChange={(e) => handleChange('confidenceMode', e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-700 border-gray-300"
                        />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Freedom Mode</label>
                            <span className="text-xs text-gray-500 dark:text-gray-400">Delete any character freely</span>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.freedomMode}
                            onChange={(e) => handleChange('freedomMode', e.target.checked)}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 dark:bg-gray-700 border-gray-300"
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}
