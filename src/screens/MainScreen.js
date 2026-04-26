import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import {
  getRecords,
  addRecord,
  getRegisteredButtons,
  addRegisteredButton,
  deleteRegisteredButton,
  getDefaultButtons,
  deleteDefaultButton,
  checkStorageCapacity,
  generateCSV,
  sendEmailWithCSV,
  deleteRecordsByDateRange,
  deleteOldestMonthData,
  getStorageSize,
} from '../storage';
import Toast from '../components/Toast';
import CalendarModal from '../components/CalendarModal';

const MainScreen = ({ navigation }) => {
  const [records, setRecords] = useState([]);
  const [registeredButtons, setRegisteredButtons] = useState([]);
  const [defaultButtons, setDefaultButtons] = useState([]);
  const [customAmount, setCustomAmount] = useState('');
  const [customMemo, setCustomMemo] = useState('');
  const [registerAsButton, setRegisterAsButton] = useState(false);
  const [buttonName, setButtonName] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [longPressIndex, setLongPressIndex] = useState(null);
  const [longPressType, setLongPressType] = useState(null);

  const longPressTimeout = useRef(null);

  useEffect(() => {
    loadData();
    checkCapacity();
  }, []);

  const loadData = async () => {
    const r = await getRecords();
    const rb = await getRegisteredButtons();
    const db = await getDefaultButtons();
    setRecords(r);
    setRegisteredButtons(rb);
    setDefaultButtons(db);
  };

  const checkCapacity = async () => {
    await checkStorageCapacity(
      () => handleWarning(),
      () => handleForceDelete()
    );
  };

  const handleWarning = () => {
    Alert.alert(
      '容量警告',
      'データ容量が上限に近づいています。古いデータをメールで書き出すことができます。',
      [
        {
          text: 'あとで',
          onPress: () => {},
        },
        {
          text: 'メールで送信して削除',
          onPress: () => showEmailDialog(),
        },
      ]
    );
  };

  const showEmailDialog = () => {
    Alert.prompt(
      'メールアドレス入力',
      '送信先のメールアドレスを入力してください',
      async (email) => {
        if (email) {
          Alert.prompt(
            '移行開始日',
            'YYYY-MM-DD形式で入力',
            async (fromDate) => {
              if (fromDate) {
                Alert.prompt(
                  '移行終了日',
                  'YYYY-MM-DD形式で入力',
                  async (toDate) => {
                    if (toDate) {
                      await handleEmailExport(email, fromDate, toDate);
                    }
                  }
                );
              }
            }
          );
        }
      }
    );
  };

  const handleEmailExport = async (email, fromDate, toDate) => {
    const filtered = records.filter((r) => r.date >= fromDate && r.date <= toDate);
    const csv = generateCSV(filtered);
    try {
      await sendEmailWithCSV(email, csv, fromDate, toDate);
      await deleteRecordsByDateRange(fromDate, toDate);
      await loadData();
      showToast('データを送信して削除しました');
    } catch (error) {
      showToast('メール送信に失敗しました');
    }
  };

  const handleForceDelete = async () => {
    let size = await getStorageSize();
    const maxSize = 6 * 1024 * 1024;

    while (size > maxSize * 0.8) {
      await deleteOldestMonthData();
      size = await getStorageSize();
      const r = await getRecords();
      if (r.length === 0) break;
    }

    await loadData();
    showToast('容量確保のため古いデータを削除しました');
  };

  const showToast = (message) => {
    setToastMessage(message);
    setToastVisible(true);
  };

  const handleQuickAdd = async (amount, name) => {
    const success = await addRecord(amount, '');
    if (success) {
      await loadData();
      await checkCapacity();
      showToast(`+¥${Math.abs(amount).toLocaleString()}（${name}）を追加しました`);
    } else {
      showToast('保存に失敗しました。再度お試しください');
    }
  };

  const handleCustomAdd = async () => {
    const amount = parseInt(customAmount, 10);

    if (!amount || amount === 0) {
      showToast('0円は記録できません');
      return;
    }

    if (amount < -100000 || amount > 100000) {
      showToast('金額は-100,000〜100,000円の範囲で入力してください');
      return;
    }

    if (customMemo.length > 500) {
      showToast('メモは500文字以内で入力してください');
      return;
    }

    if (registerAsButton) {
      if (registeredButtons.length >= 30) {
        showToast('登録済みボタンは30個までです');
        return;
      }

      if (buttonName.length > 30) {
        showToast('ボタン名は30文字以内で入力してください');
        return;
      }

      const success = await addRecord(amount, customMemo);
      if (success) {
        await addRegisteredButton(amount, buttonName);
        await loadData();
        await checkCapacity();
        showToast(`+¥${Math.abs(amount).toLocaleString()} を追加 & 「${buttonName}」を登録しました`);
      } else {
        showToast('保存に失敗しました。再度お試しください');
      }
    } else {
      const success = await addRecord(amount, customMemo);
      if (success) {
        await loadData();
        await checkCapacity();
        showToast(`+¥${Math.abs(amount).toLocaleString()} を追加しました`);
      } else {
        showToast('保存に失敗しました。再度お試しください');
      }
    }

    setCustomAmount('');
    setCustomMemo('');
    setButtonName('');
    setRegisterAsButton(false);
  };

  const handleLongPress = (index, type) => {
    setLongPressIndex(index);
    setLongPressType(type);

    longPressTimeout.current = setTimeout(() => {
      setLongPressIndex(null);
      setLongPressType(null);
    }, 3000);
  };

  const handleDelete = async (index, type) => {
    clearTimeout(longPressTimeout.current);
    setLongPressIndex(null);
    setLongPressType(null);

    if (type === 'registered') {
      await deleteRegisteredButton(index);
    } else {
      await deleteDefaultButton(index);
    }

    await loadData();
  };

  const handleCancelDelete = () => {
    clearTimeout(longPressTimeout.current);
    setLongPressIndex(null);
    setLongPressType(null);
  };

  const calculateMonthTotal = () => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return records
      .filter((r) => r.date.startsWith(currentMonth))
      .reduce((sum, r) => sum + r.amount, 0);
  };

  const calculateTodayTotal = () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return records
      .filter((r) => r.date === today)
      .reduce((sum, r) => sum + r.amount, 0);
  };

  const calculatePrevMonthTotal = () => {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthStr = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    return records
      .filter((r) => r.date.startsWith(prevMonthStr))
      .reduce((sum, r) => sum + r.amount, 0);
  };

  const monthTotal = calculateMonthTotal();
  const todayTotal = calculateTodayTotal();
  const prevMonthTotal = calculatePrevMonthTotal();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const todayStr = `${now.getMonth() + 1}月${now.getDate()}日`;

  const renderButtonSection = (buttons, type) => {
    const isRegistered = type === 'registered';
    const rows = [];
    for (let i = 0; i < buttons.length; i += 3) {
      rows.push(buttons.slice(i, i + 3));
    }
    return rows.map((row, rowIdx) => (
      <View key={row.map(b => b.id).join('-')} style={styles.buttonRow}>
        {row.map((btn, colIdx) => {
          const idx = rowIdx * 3 + colIdx;
          const isDeleting = longPressIndex === idx && longPressType === type;
          const amountLabel = btn.amount < 0
            ? `-¥${Math.abs(btn.amount).toLocaleString()}`
            : `+¥${btn.amount.toLocaleString()}`;
          return (
            <View key={btn.id} style={styles.buttonWrapper}>
              <TouchableOpacity
                style={[styles.quickButton, isRegistered && styles.quickButtonRegistered]}
                onPress={() => isDeleting ? handleCancelDelete() : handleQuickAdd(btn.amount, btn.name)}
                onLongPress={() => handleLongPress(idx, type)}
                delayLongPress={500}
              >
                <Text style={[styles.buttonAmount, isRegistered && styles.buttonAmountRegistered]}>
                  {amountLabel}
                </Text>
                <Text style={[styles.buttonName, isRegistered && styles.buttonNameRegistered]}>
                  {btn.name}
                </Text>
              </TouchableOpacity>
              {isDeleting && (
                <TouchableOpacity
                  style={styles.deleteBadge}
                  onPress={() => handleDelete(idx, type)}
                >
                  <Text style={styles.deleteBadgeText}>削除</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
        {Array(3 - row.length).fill(null).map((_, i) => (
          <View key={`filler-${i}`} style={styles.buttonWrapper} />
        ))}
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>我慢貯金</Text>
        <TouchableOpacity onPress={() => navigation.navigate('History')}>
          <Text style={styles.headerLink}>履歴 →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.topArea}>
          <TouchableOpacity
            style={styles.calendarIcon}
            onPress={() => setCalendarVisible(true)}
          >
            <Text style={styles.calendarIconText}>📅</Text>
          </TouchableOpacity>

          <Text style={styles.monthLabel}>{currentMonth}月の我慢貯金</Text>
          <Text style={styles.totalAmount}>
            ¥{monthTotal < 0 ? '-' : ''}{Math.abs(monthTotal).toLocaleString()}
          </Text>

          <View style={styles.divider} />

          <View style={styles.todayRow}>
            <Text style={styles.todayLabel}>今日の合計</Text>
            <Text style={styles.todayAmount}>
              {todayStr}：¥{todayTotal < 0 ? '-' : ''}{Math.abs(todayTotal).toLocaleString()}
            </Text>
          </View>

          <Text style={styles.prevMonthLabel}>
            {prevMonth}月の実績 ¥{prevMonthTotal < 0 ? '-' : ''}{Math.abs(prevMonthTotal).toLocaleString()}
          </Text>
        </View>

        <View style={styles.middleArea}>
          {registeredButtons.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>登録済み</Text>
              {renderButtonSection(registeredButtons, 'registered')}
            </>
          )}

          <Text style={styles.sectionLabel}>デフォルト</Text>
          {renderButtonSection(defaultButtons, 'default')}

          <View style={styles.customCard}>
            <View style={styles.customRow}>
              <TextInput
                style={styles.amountInput}
                placeholder="金額"
                keyboardType="numeric"
                value={customAmount}
                onChangeText={setCustomAmount}
              />
              <TouchableOpacity style={styles.addButton} onPress={handleCustomAdd}>
                <Text style={styles.addButtonText}>追加</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.memoInput}
              placeholder="メモ（任意）"
              value={customMemo}
              onChangeText={setCustomMemo}
            />

            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setRegisterAsButton(!registerAsButton)}
              >
                <View style={styles.checkboxBox}>
                  {registerAsButton && <View style={styles.checkboxChecked} />}
                </View>
                <Text style={styles.checkboxLabel}>ワンタップボタンに登録する</Text>
              </TouchableOpacity>
            </View>

            {registerAsButton && (
              <TextInput
                style={styles.buttonNameInput}
                placeholder="ボタン名"
                value={buttonName}
                onChangeText={setButtonName}
              />
            )}
          </View>
        </View>

        <View style={styles.bottomArea}>
          <View style={styles.adBanner}>
            <Text style={styles.adText}>広告</Text>
          </View>
        </View>
      </ScrollView>

      <Toast
        message={toastMessage}
        visible={toastVisible}
        onHide={() => setToastVisible(false)}
      />

      <CalendarModal
        visible={calendarVisible}
        onClose={() => setCalendarVisible(false)}
        records={records}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerLink: {
    fontSize: 16,
    color: '#2a7ae4',
  },
  scrollView: {
    flex: 1,
  },
  topArea: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  calendarIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  calendarIconText: {
    fontSize: 24,
  },
  monthLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  todayRow: {
    marginBottom: 8,
  },
  todayLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  todayAmount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  prevMonthLabel: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  middleArea: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: 'bold',
    marginBottom: 4,
    marginLeft: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  buttonWrapper: {
    flex: 1,
    padding: 4,
  },
  quickButton: {
    backgroundColor: '#2a7ae4',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
  },
  quickButtonRegistered: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#2a7ae4',
  },
  buttonAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  buttonAmountRegistered: {
    color: '#2a7ae4',
  },
  buttonName: {
    fontSize: 12,
    color: '#fff',
  },
  buttonNameRegistered: {
    color: '#555',
  },
  deleteBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 20,
  },
  deleteBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  customCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  customRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  amountInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#34c759',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  memoInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  checkboxRow: {
    marginBottom: 12,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#2a7ae4',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    width: 12,
    height: 12,
    backgroundColor: '#2a7ae4',
    borderRadius: 2,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#333',
  },
  buttonNameInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  bottomArea: {
    padding: 16,
  },
  adBanner: {
    height: 150,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adText: {
    fontSize: 16,
    color: '#999',
  },
});

export default MainScreen;
