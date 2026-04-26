import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
} from 'react-native';
import { getRecords } from '../storage';

const HistoryScreen = ({ navigation }) => {
  const [records, setRecords] = useState([]);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    const r = await getRecords();
    setRecords(r);
  };

  const getOldestRecordMonth = () => {
    if (records.length === 0) return null;
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    const oldest = sorted[0].date;
    const [year, month] = oldest.split('-').map(Number);
    return { year, month: month - 1 };
  };

  const isCurrentMonth =
    currentYear === new Date().getFullYear() &&
    currentMonth === new Date().getMonth();

  const oldest = getOldestRecordMonth();
  const isOldestMonth =
    oldest && currentYear === oldest.year && currentMonth === oldest.month;

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getMonthRecords = () => {
    const targetMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    return records.filter((r) => r.date.startsWith(targetMonth));
  };

  const calculateMonthTotal = () => {
    return getMonthRecords().reduce((sum, r) => sum + r.amount, 0);
  };

  const groupByDate = () => {
    const monthRecords = getMonthRecords();
    const groups = {};

    monthRecords.forEach((r) => {
      if (!groups[r.date]) {
        groups[r.date] = [];
      }
      groups[r.date].push(r);
    });

    const sorted = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    return sorted.map((date) => ({ date, records: groups[date] }));
  };

  const formatDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekdays[date.getDay()];
    return `${month}月${day}日（${weekday}）`;
  };

  const groupedData = groupByDate();
  const monthTotal = calculateMonthTotal();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← もどる</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{currentMonth + 1}月</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.monthControls}>
        <TouchableOpacity
          onPress={handlePrevMonth}
          disabled={isOldestMonth}
          style={styles.monthButton}
        >
          <Text style={[styles.monthButtonText, isOldestMonth && styles.disabledText]}>
            ‹ 前月
          </Text>
        </TouchableOpacity>

        <Text style={styles.monthDisplay}>
          {currentYear}年{currentMonth + 1}月
        </Text>

        <TouchableOpacity
          onPress={handleNextMonth}
          disabled={isCurrentMonth}
          style={styles.monthButton}
        >
          <Text style={[styles.monthButtonText, isCurrentMonth && styles.disabledText]}>
            翌月 ›
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.totalBar}>
        <Text style={styles.totalLabel}>合計</Text>
        <Text style={styles.totalAmount}>
          ¥{monthTotal < 0 ? '-' : ''}{Math.abs(monthTotal).toLocaleString()}
        </Text>
      </View>

      <FlatList
        data={groupedData}
        keyExtractor={(item) => item.date}
        renderItem={({ item }) => (
          <View style={styles.dateGroup}>
            <Text style={styles.dateHeader}>{formatDate(item.date)}</Text>
            {item.records.map((record) => (
              <View key={record.id} style={styles.recordRow}>
                <Text style={styles.recordMemo}>{record.memo || '記録'}</Text>
                <Text
                  style={[
                    styles.recordAmount,
                    record.amount < 0 && styles.recordAmountNegative,
                  ]}
                >
                  ¥{record.amount < 0 ? '-' : ''}{Math.abs(record.amount).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>この月のデータはありません</Text>
          </View>
        }
      />

      <View style={styles.adBanner}>
        <Text style={styles.adText}>広告</Text>
      </View>
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
  backButton: {
    fontSize: 16,
    color: '#2a7ae4',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  monthControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  monthButton: {
    padding: 8,
  },
  monthButtonText: {
    fontSize: 16,
    color: '#2a7ae4',
  },
  disabledText: {
    color: '#ccc',
  },
  monthDisplay: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  dateGroup: {
    marginBottom: 16,
    backgroundColor: '#fff',
    paddingVertical: 12,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recordMemo: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  recordAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 12,
  },
  recordAmountNegative: {
    color: '#ff3b30',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  adBanner: {
    height: 50,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adText: {
    fontSize: 14,
    color: '#999',
  },
});

export default HistoryScreen;
