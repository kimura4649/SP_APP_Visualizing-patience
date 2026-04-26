import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MailComposer from 'expo-mail-composer';

const MAX_STORAGE_BYTES = 6 * 1024 * 1024;

const DEFAULT_BUTTONS = [
  { id: 1, amount: 150, name: 'ジュース' },
  { id: 2, amount: 500, name: 'コンビニ' },
  { id: 3, amount: 800, name: '外食' },
  { id: 4, amount: 300, name: 'お菓子' },
  { id: 5, amount: 1200, name: 'ランチ' },
  { id: 6, amount: 2000, name: '飲み会' },
];

export const getRecords = async () => {
  try {
    const data = await AsyncStorage.getItem('records');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load records:', error);
    return [];
  }
};

export const saveRecords = async (records) => {
  try {
    await AsyncStorage.setItem('records', JSON.stringify(records));
    return true;
  } catch (error) {
    console.error('Failed to save records:', error);
    return false;
  }
};

export const addRecord = async (amount, memo = '') => {
  const records = await getRecords();
  const maxId = records.reduce((max, r) => Math.max(max, parseInt(r.id, 10)), 0);
  const newId = String(maxId + 1).padStart(3, '0');

  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const newRecord = {
    id: newId,
    date: dateStr,
    amount,
    memo,
  };

  records.push(newRecord);
  const success = await saveRecords(records);
  return success;
};

export const getArchivedRecords = async () => {
  try {
    const data = await AsyncStorage.getItem('archivedRecords');
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load archived records:', error);
    return [];
  }
};

export const saveArchivedRecords = async (archived) => {
  try {
    await AsyncStorage.setItem('archivedRecords', JSON.stringify(archived));
    return true;
  } catch (error) {
    console.error('Failed to save archived records:', error);
    return false;
  }
};

export const getRegisteredButtons = async () => {
  try {
    const data = await AsyncStorage.getItem('registeredButtons');
    if (!data) return [];
    const buttons = JSON.parse(data);
    if (buttons.length > 0 && buttons.some(b => b.id === undefined)) {
      const migrated = buttons.map((b, i) => ({ ...b, id: i + 1 }));
      await AsyncStorage.setItem('registeredButtons', JSON.stringify(migrated));
      return migrated;
    }
    return buttons;
  } catch (error) {
    console.error('Failed to load registered buttons:', error);
    return [];
  }
};

export const saveRegisteredButtons = async (buttons) => {
  try {
    await AsyncStorage.setItem('registeredButtons', JSON.stringify(buttons));
    return true;
  } catch (error) {
    console.error('Failed to save registered buttons:', error);
    return false;
  }
};

export const addRegisteredButton = async (amount, name) => {
  const buttons = await getRegisteredButtons();
  const maxId = buttons.reduce((max, b) => Math.max(max, b.id || 0), 0);
  buttons.push({ id: maxId + 1, amount, name });
  return await saveRegisteredButtons(buttons);
};

export const deleteRegisteredButton = async (index) => {
  const buttons = await getRegisteredButtons();
  buttons.splice(index, 1);
  return await saveRegisteredButtons(buttons);
};

export const getDefaultButtons = async () => {
  try {
    const data = await AsyncStorage.getItem('defaultButtons');
    if (data) {
      const buttons = JSON.parse(data);
      if (buttons.some(b => b.id === undefined)) {
        const migrated = buttons.map((b, i) => ({ ...b, id: i + 1 }));
        await AsyncStorage.setItem('defaultButtons', JSON.stringify(migrated));
        return migrated;
      }
      return buttons;
    } else {
      await AsyncStorage.setItem('defaultButtons', JSON.stringify(DEFAULT_BUTTONS));
      return DEFAULT_BUTTONS;
    }
  } catch (error) {
    console.error('Failed to load default buttons:', error);
    return DEFAULT_BUTTONS;
  }
};

export const saveDefaultButtons = async (buttons) => {
  try {
    await AsyncStorage.setItem('defaultButtons', JSON.stringify(buttons));
    return true;
  } catch (error) {
    console.error('Failed to save default buttons:', error);
    return false;
  }
};

export const deleteDefaultButton = async (index) => {
  const buttons = await getDefaultButtons();
  buttons.splice(index, 1);
  return await saveDefaultButtons(buttons);
};

export const getStorageSize = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const items = await AsyncStorage.multiGet(keys);
    let totalSize = 0;
    items.forEach(([key, value]) => {
      if (value) {
        totalSize += new Blob([value]).size;
      }
    });
    return totalSize;
  } catch (error) {
    console.error('Failed to calculate storage size:', error);
    return 0;
  }
};

export const checkStorageCapacity = async (onWarning, onForceDelete) => {
  const size = await getStorageSize();
  const usagePercent = (size / MAX_STORAGE_BYTES) * 100;

  if (usagePercent >= 90) {
    if (onForceDelete) {
      await onForceDelete();
    }
  } else if (usagePercent >= 80) {
    if (onWarning) {
      await onWarning();
    }
  }
};

export const generateCSV = (records) => {
  const BOM = '﻿';
  let csv = BOM + 'date,amount,memo\r\n';
  records.forEach((r) => {
    const memo = r.memo.replace(/"/g, '""');
    csv += `${r.date},${r.amount},"${memo}"\r\n`;
  });
  return csv;
};

export const deleteRecordsByDateRange = async (fromDate, toDate) => {
  const records = await getRecords();
  const archived = await getArchivedRecords();

  const today = new Date();
  const deletedAt = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const toDelete = records.filter((r) => r.date >= fromDate && r.date <= toDate);
  const remaining = records.filter((r) => r.date < fromDate || r.date > toDate);

  toDelete.forEach((r) => {
    archived.push({ ...r, deletedAt });
  });

  const reIdRecords = remaining.map((r, index) => ({
    ...r,
    id: String(index + 1).padStart(3, '0'),
  }));

  await saveRecords(reIdRecords);
  await saveArchivedRecords(archived);
};

export const deleteOldestMonthData = async () => {
  const records = await getRecords();
  if (records.length === 0) return;

  const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const oldestMonth = sortedRecords[0].date.substring(0, 7);

  const archived = await getArchivedRecords();
  const today = new Date();
  const deletedAt = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const toDelete = records.filter((r) => r.date.startsWith(oldestMonth));
  const remaining = records.filter((r) => !r.date.startsWith(oldestMonth));

  toDelete.forEach((r) => {
    archived.push({ ...r, deletedAt });
  });

  const reIdRecords = remaining.map((r, index) => ({
    ...r,
    id: String(index + 1).padStart(3, '0'),
  }));

  await saveRecords(reIdRecords);
  await saveArchivedRecords(archived);
};

export const sendEmailWithCSV = async (email, csvContent, fromDate, toDate) => {
  const isAvailable = await MailComposer.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('メール機能が利用できません');
  }

  const base64 = btoa(unescape(encodeURIComponent(csvContent)));

  await MailComposer.composeAsync({
    recipients: [email],
    subject: '我慢貯金データ',
    body: `${fromDate} から ${toDate} までのデータです。`,
    attachments: [
      {
        uri: `data:text/csv;base64,${base64}`,
        mimeType: 'text/csv',
        filename: `gaman_chokin_${fromDate}_${toDate}.csv`,
      },
    ],
  });
};
