import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';

const CalendarModal = ({ visible, onClose, records }) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());

  useEffect(() => {
    if (visible) {
      setCurrentYear(today.getFullYear());
      setCurrentMonth(today.getMonth());
    }
  }, [visible]);

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const getOldestRecordMonth = () => {
    if (!records || records.length === 0) return null;
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
    const oldest = sorted[0].date;
    const [year, month] = oldest.split('-').map(Number);
    return { year, month: month - 1 };
  };

  const isCurrentMonth = currentYear === today.getFullYear() && currentMonth === today.getMonth();

  const oldest = getOldestRecordMonth();
  const isOldestMonth = oldest && currentYear === oldest.year && currentMonth === oldest.month;

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

  const calculateDailyTotals = () => {
    const totals = {};
    const targetYearMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

    records
      .filter((r) => r.date.startsWith(targetYearMonth))
      .forEach((r) => {
        const day = parseInt(r.date.split('-')[2], 10);
        totals[day] = (totals[day] || 0) + r.amount;
      });

    return totals;
  };

  const calculateMonthTotal = () => {
    const targetYearMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    return records
      .filter((r) => r.date.startsWith(targetYearMonth))
      .reduce((sum, r) => sum + r.amount, 0);
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
    const dailyTotals = calculateDailyTotals();

    const weeks = [];
    let week = [];

    for (let i = 0; i < firstDay; i++) {
      week.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday =
        day === today.getDate() &&
        currentMonth === today.getMonth() &&
        currentYear === today.getFullYear();

      const total = dailyTotals[day];

      week.push(
        <View
          key={day}
          style={[styles.dayCell, isToday && styles.todayCell]}
        >
          <Text style={[styles.dayNumber, isToday && styles.todayText]}>{day}</Text>
          {total !== undefined && (
            <Text style={[styles.dayAmount, isToday && styles.todayText]}>
              ¥{Math.abs(total).toLocaleString()}
            </Text>
          )}
        </View>
      );

      if (week.length === 7) {
        weeks.push(
          <View key={`week-${weeks.length}`} style={styles.weekRow}>
            {week}
          </View>
        );
        week = [];
      }
    }

    if (week.length > 0) {
      while (week.length < 7) {
        week.push(<View key={`empty-end-${week.length}`} style={styles.dayCell} />);
      }
      weeks.push(
        <View key={`week-${weeks.length}`} style={styles.weekRow}>
          {week}
        </View>
      );
    }

    return weeks;
  };

  const monthTotal = calculateMonthTotal();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              disabled={isOldestMonth}
              style={styles.navButton}
            >
              <Text style={[styles.navText, isOldestMonth && styles.disabledText]}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {currentYear}年{currentMonth + 1}月
            </Text>
            <TouchableOpacity
              onPress={handleNextMonth}
              disabled={isCurrentMonth}
              style={styles.navButton}
            >
              <Text style={[styles.navText, isCurrentMonth && styles.disabledText]}>›</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.monthTotal}>
            {currentMonth + 1}月 合計：¥{Math.abs(monthTotal).toLocaleString()}
            {monthTotal < 0 && '-'}
          </Text>

          <View style={styles.weekHeader}>
            {['日', '月', '火', '水', '木', '金', '土'].map((day) => (
              <Text key={day} style={styles.weekDay}>
                {day}
              </Text>
            ))}
          </View>

          <ScrollView style={styles.calendarScroll}>
            {renderCalendar()}
          </ScrollView>

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>閉じる</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navButton: {
    padding: 8,
  },
  navText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  disabledText: {
    color: '#ccc',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  monthTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  calendarScroll: {
    maxHeight: 300,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  todayCell: {
    backgroundColor: '#2a7ae4',
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  todayText: {
    color: '#fff',
  },
  dayAmount: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    marginTop: 16,
    backgroundColor: '#2a7ae4',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CalendarModal;
