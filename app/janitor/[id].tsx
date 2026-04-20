import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Green } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { type Task, getUserTasks, createTask, toggleTaskComplete } from '@/lib/api';
import { getTodayISO, getWeekDates, getWeekRange } from '@/utils/dates';

export default function JanitorDetailScreen() {
  const { user } = useAuth();
  const { id: janitorId, name: janitorName } = useLocalSearchParams<{ id: string; name: string }>();

  const [tasks, setTasks]             = useState<Task[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [taskTitle, setTaskTitle]     = useState('');
  const [selectedDate, setSelectedDate] = useState(getTodayISO());
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');

  const today     = getTodayISO();
  const weekDates = getWeekDates();
  const { from, to } = getWeekRange();

  const load = () => {
    setLoading(true);
    getUserTasks(janitorId, from, to)
      .then(setTasks)
      .finally(() => setLoading(false));
  };

  useEffect(load, [janitorId]);

  const handleToggle = async (taskId: string) => {
    const updated = await toggleTaskComplete(taskId);
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };

  const handleAssign = async () => {
    if (!taskTitle.trim()) { setError('Please enter a task title.'); return; }
    if (!user) return;
    setError('');
    setSubmitting(true);
    try {
      const due_type = selectedDate === today ? 'day' : 'week';
      const created = await createTask({
        title: taskTitle.trim(),
        assigned_to: janitorId,
        assigned_by: user.id,
        due_type,
        due_date: selectedDate,
      });
      setTasks((prev) => [...prev, created]);
      setTaskTitle('');
      setShowForm(false);
    } catch (e: any) {
      setError(e.message ?? 'Failed to assign task.');
    } finally {
      setSubmitting(false);
    }
  };

  const byDate = weekDates.reduce<Record<string, Task[]>>((acc, { iso }) => {
    acc[iso] = tasks.filter((t) => t.due_date === iso);
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{janitorName}</Text>
        <TouchableOpacity
          onPress={() => { setShowForm((v) => !v); setError(''); }}
          style={styles.assignBtn}
          accessibilityRole="button"
          accessibilityLabel="Assign task">
          <Text style={styles.assignBtnText}>{showForm ? 'Cancel' : '+ Assign'}</Text>
        </TouchableOpacity>
      </View>

      {/* Task creation form */}
      {showForm && (
        <View style={styles.form}>
          <Text style={styles.formLabel}>Task Title</Text>
          <TextInput
            style={styles.input}
            value={taskTitle}
            onChangeText={setTaskTitle}
            placeholder="e.g. Mop the lobby"
            returnKeyType="done"
            accessibilityLabel="Task title"
          />

          <Text style={styles.formLabel}>Schedule</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayScroll}>
            {weekDates.map(({ iso, short, date }) => (
              <TouchableOpacity
                key={iso}
                style={[styles.dayChip, selectedDate === iso && styles.dayChipActive]}
                onPress={() => setSelectedDate(iso)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selectedDate === iso }}
                accessibilityLabel={`${short} ${date}`}>
                <Text style={[styles.dayChipShort, selectedDate === iso && styles.dayChipTextActive]}>
                  {short}
                </Text>
                <Text style={[styles.dayChipDate, selectedDate === iso && styles.dayChipTextActive]}>
                  {date}
                </Text>
                {iso === today && (
                  <View style={styles.todayDot} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleAssign}
            disabled={submitting}
            accessibilityRole="button">
            {submitting
              ? <ActivityIndicator color={Green.onPrimary} />
              : <Text style={styles.submitBtnText}>Assign Task</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Task list grouped by day */}
      {loading ? (
        <ActivityIndicator color={Green.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {weekDates.map(({ iso, short, date }) => (
            <View key={iso}>
              <View style={[styles.dayHeader, iso === today && styles.dayHeaderToday]}>
                <Text style={[styles.dayHeaderText, iso === today && styles.dayHeaderTextToday]}>
                  {short} {date}{iso === today ? '  · Today' : ''}
                </Text>
              </View>
              {byDate[iso].length === 0 ? (
                <Text style={styles.emptyDayText}>No tasks</Text>
              ) : (
                byDate[iso].map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.taskRow}
                    onPress={() => handleToggle(t.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: t.completed }}>
                    <View style={[styles.checkbox, t.completed && styles.checkboxDone]}>
                      {t.completed && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={[styles.taskTitle, t.completed && styles.taskTitleDone]}>
                      {t.title}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: Green.surface },

  // Header
  header:             {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Green.primary,
    paddingTop: 56,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  backBtn:            { marginRight: 8 },
  backText:           { color: '#fff', fontSize: 16 },
  headerTitle:        { flex: 1, color: '#fff', fontSize: 18, fontWeight: '700' },
  assignBtn:          {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  assignBtnText:      { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Form
  form:               {
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  formLabel:          { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  input:              {
    borderWidth: 1.5,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 14,
    color: '#111',
  },
  dayScroll:          { marginBottom: 14 },
  dayChip:            {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Green.light,
    marginRight: 8,
    minWidth: 48,
  },
  dayChipActive:      { backgroundColor: Green.primary, borderColor: Green.primary },
  dayChipShort:       { fontSize: 11, fontWeight: '700', color: Green.primary },
  dayChipDate:        { fontSize: 15, fontWeight: '700', color: Green.primary, marginTop: 2 },
  dayChipTextActive:  { color: '#fff' },
  todayDot:           {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Green.secondary,
    marginTop: 3,
  },
  errorText:          { color: '#C62828', fontSize: 13, marginBottom: 10 },
  submitBtn:          {
    backgroundColor: Green.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  submitBtnDisabled:  { opacity: 0.6 },
  submitBtnText:      { color: Green.onPrimary, fontWeight: '700', fontSize: 15 },

  // Task list
  listContent:        { padding: 12 },
  dayHeader:          {
    backgroundColor: Green.light,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 6,
    marginTop: 8,
  },
  dayHeaderToday:     { backgroundColor: Green.primary },
  dayHeaderText:      { fontSize: 13, fontWeight: '700', color: Green.dark },
  dayHeaderTextToday: { color: '#fff' },
  emptyDayText:       { fontSize: 13, color: '#bbb', marginLeft: 12, marginBottom: 6 },
  taskRow:            {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  checkbox:           {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Green.primary,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone:       { backgroundColor: Green.primary },
  checkmark:          { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  taskTitle:          { fontSize: 14, color: '#222', flex: 1 },
  taskTitleDone:      { color: '#aaa', textDecorationLine: 'line-through' },
});
