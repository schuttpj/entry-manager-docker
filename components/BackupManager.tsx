import React, { useEffect, useState } from 'react';
import { createBackup, restoreFromBackup, downloadBackupFile } from '../lib/db';
import { toast } from 'react-hot-toast';

const BACKUP_REMINDER_DAYS = 7; // Remind every 7 days
const BACKUP_REMINDER_KEY = 'lastBackupReminder';
const LAST_BACKUP_KEY = 'lastBackupDate';

export default function BackupManager() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  useEffect(() => {
    // Check last backup date
    const lastBackupDate = localStorage.getItem(LAST_BACKUP_KEY);
    setLastBackup(lastBackupDate);

    // Check if we need to show a reminder
    const lastReminder = localStorage.getItem(BACKUP_REMINDER_KEY);
    const now = new Date();
    const shouldRemind = !lastReminder || 
      (now.getTime() - new Date(lastReminder).getTime()) > (BACKUP_REMINDER_DAYS * 24 * 60 * 60 * 1000);

    if (shouldRemind) {
      toast('Remember to backup your snag list data regularly!', {
        duration: 5000,
        icon: '💾'
      });
      localStorage.setItem(BACKUP_REMINDER_KEY, now.toISOString());
    }
  }, []);

  const handleBackup = async () => {
    setIsLoading(true);
    try {
      const backup = await createBackup();
      downloadBackupFile(backup);
      const now = new Date().toISOString();
      localStorage.setItem(LAST_BACKUP_KEY, now);
      setLastBackup(now);
      toast.success('Backup created successfully!');
    } catch (error) {
      console.error('Backup failed:', error);
      toast.error('Failed to create backup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);

    // Show confirmation dialog
    if (!window.confirm('Restoring will replace all current data. Are you sure you want to continue?')) {
      setSelectedFile(null);
      return;
    }

    setIsLoading(true);
    try {
      const backupData = JSON.parse(await file.text());
      await restoreFromBackup(backupData);
      toast.success('Data restored successfully!');
    } catch (error) {
      console.error('Restore failed:', error);
      toast.error('Failed to restore backup');
    } finally {
      setIsLoading(false);
      setSelectedFile(null);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Backup Management</h2>
      
      {lastBackup && (
        <p className="text-sm text-gray-600 mb-4">
          Last backup: {new Date(lastBackup).toLocaleDateString()}
        </p>
      )}

      <div className="space-y-4">
        <button
          onClick={handleBackup}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : '💾 Create Backup'}
        </button>

        <div className="relative">
          <input
            type="file"
            accept=".json"
            onChange={handleRestore}
            disabled={isLoading}
            className="hidden"
            id="restore-backup"
          />
          <label
            htmlFor="restore-backup"
            className={`block w-full px-4 py-2 text-center border-2 border-dashed 
              ${isLoading ? 'border-gray-300 bg-gray-100' : 'border-blue-300 hover:border-blue-400'} 
              rounded cursor-pointer`}
          >
            {isLoading ? 'Processing...' : '📥 Restore from Backup'}
          </label>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs text-gray-500">
          ℹ️ Backups include all projects and snags, but exclude voice recordings.
          We recommend creating backups regularly.
        </p>
      </div>
    </div>
  );
} 