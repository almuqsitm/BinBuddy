import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams, Link } from 'expo-router';

import { Green } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { type Task, getUserTasks, createTask, createSubtask, toggleTaskComplete } from '@/lib/api';
import { getTodayISO, getWeekDates, getWeekRange } from '@/utils/dates';

export default function JanitorDetailScreen() {
  const { user } = useAuth();
  const { id: janitorId, name: janitorName } = useLocalSearchParams<{ id: string; name: string }>();

  const [tasks, setTasks]             = useState<Task[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [taskTitle, setTaskTitle]       = useState('');
  const [location, setLocation]         = useState('');
  const [taskType, setTaskType]         = useState<'standard' | 'garbage_collection'>('standard');
  const [subtaskInputs, setSubtaskInputs] = useState<string[]>([]);
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
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? { ...t, completed: updated.completed } : t)));
  };

  const addSubtaskField = () => setSubtaskInputs((prev) => [...prev, '']);

  const updateSubtask = (index: number, value: string) =>
    setSubtaskInputs((prev) => prev.map((s, i) => (i === index ? value : s)));

  const removeSubtask = (index: number) =>
    setSubtaskInputs((prev) => prev.filter((_, i) => i !== index));

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
        location: location.trim(),
        task_type: taskType,
      });

      const nonEmptySubtasks = taskType === 'standard'
        ? subtaskInputs.map((s) => s.trim()).filter(Boolean)
        : [];
      const createdSubtasks = await Promise.all(
        nonEmptySubtasks.map((title, i) => createSubtask(created.id, title, i))
      );

      setTasks((prev) => [...prev, { ...created, subtasks: createdSubtasks }]);
      setTaskTitle('');
      setLocation('');
      setTaskType('standard');
      setSubtaskInputs([]);
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
        <Text style={styles.headerTitle} numberOfLines={1}>{janitorName}</Text>
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
        <ScrollView style={styles.formScroll} keyboardShouldPersistTaps="handled">
          <View style={styles.form}>
            <Text style={styles.formLabel}>Task Type</Text>
            <View style={styles.typeRow}>
              {(['standard', 'garbage_collection'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, taskType === t && styles.typeBtnActive]}
                  onPress={() => setTaskType(t)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: taskType === t }}>
                  <Text style={[styles.typeBtnText, taskType === t && styles.typeBtnTextActive]}>
                    {t === 'standard' ? 'Standard' : 'Garbage Collection'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Task Title</Text>
            <TextInput
              style={styles.input}
              value={taskTitle}
              onChangeText={setTaskTitle}
              placeholder={taskType === 'garbage_collection' ? 'e.g. Collect garbage' : 'e.g. Clean the bathroom'}
              returnKeyType="next"
              accessibilityLabel="Task title"
            />

            <Text style={styles.formLabel}>Location</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. 2nd floor bathroom"
              returnKeyType="next"
              accessibilityLabel="Location"
            />

            {taskType === 'garbage_collection' && (
              <View style={styles.gcNote}>
                <Text style={styles.gcNoteText}>
                  🗺️ A floor map with garbage locations will be auto-generated for the janitor.
                </Text>
              </View>
            )}

            {taskType === 'standard' && (
            <Text style={styles.formLabel}>Steps (optional)</Text>
            )}
            {taskType === 'standard' && subtaskInputs.map((val, i) => (
              <View key={i} style={styles.subtaskRow}>
                <TextInput
                  style={[styles.input, styles.subtaskInput]}
                  value={val}
                  onChangeText={(t) => updateSubtask(i, t)}
                  placeholder={`Step ${i + 1}`}
                  returnKeyType="next"
                  accessibilityLabel={`Step ${i + 1}`}
                />
                <TouchableOpacity
                  onPress={() => removeSubtask(i)}
                  style={styles.removeBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Remove step">
                  <Text style={styles.removeBtnText}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            {taskType === 'standard' && <TouchableOpacity onPress={addSubtaskField} style={styles.addStepBtn}>
              <Text style={styles.addStepText}>+ Add step</Text>
            </TouchableOpacity>}


            <Text style={[styles.formLabel, { marginTop: 12 }]}>Schedule</Text>
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
                  {iso === today && <View style={styles.todayDot} />}
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
        </ScrollView>
      )}

      {/* Task list grouped by day */}
      {!showForm && (
        loading ? (
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
                    t.task_type === 'garbage_collection' ? (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.taskCard, styles.taskCardGarbage]}
                        onPress={() => router.push({
                          pathname: '/garbage-map/[task_id]' as any,
                          params: { task_id: t.id, task_title: t.title },
                        })}
                        accessibilityRole="button"
                        accessibilityLabel={`View garbage map for ${t.title}`}>
                        <View style={styles.taskCardHeader}>
                          {t.completed && <Text style={styles.garbageEmoji}>✅</Text>}
                          <View style={styles.taskCardInfo}>
                            <Text style={[styles.taskTitle, t.completed && styles.taskTitleDone]}>{t.title}</Text>
                            {!!t.location && <Text style={styles.locationTag}>📍 {t.location}</Text>}
                            <Text style={styles.viewMapHint}>Tap to view collection map →</Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ) : (
                    <View key={t.id} style={styles.taskCard}>
                      <View style={styles.taskCardHeader}>
                        <View style={[styles.checkbox, t.completed && styles.checkboxDone]}>
                          {t.completed && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <View style={styles.taskCardInfo}>
                          <Text style={[styles.taskTitle, t.completed && styles.taskTitleDone]}>
                            {t.title}
                          </Text>
                          {!!t.location && (
                            <Text style={styles.locationTag}>📍 {t.location}</Text>
                          )}
                        </View>
                      </View>
                      {t.subtasks && t.subtasks.length > 0 && (
                        <View style={styles.subtaskList}>
                          {[...t.subtasks]
                            .sort((a, b) => a.order_index - b.order_index)
                            .map((s) => (
                              <View key={s.id} style={styles.subtaskReadRow}>
                                <View style={[styles.subtaskBox, s.completed && styles.subtaskBoxDone]}>
                                  {s.completed && <Text style={styles.subtaskCheckmark}>✓</Text>}
                                </View>
                                <Text style={[styles.subtaskText, s.completed && styles.subtaskTextDone]}>
                                  {s.title}
                                </Text>
                              </View>
                            ))}
                        </View>
                      )}
                    </View>
                    ) // end inner ternary false branch
                  ))  // closes arrow fn + .map(
                )}
              </View>
            ))}
          </ScrollView>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: Green.surface },

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

  formScroll:         { maxHeight: '70%' },
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
    marginBottom: 12,
    color: '#111',
    flex: 1,
  },
  subtaskRow:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 0 },
  subtaskInput:       { marginBottom: 8 },
  removeBtn:          {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE0E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  removeBtnText:      { color: '#C62828', fontSize: 18, fontWeight: 'bold', lineHeight: 20 },
  taskCardGarbage:    { borderLeftWidth: 4, borderLeftColor: '#E53935' },
  garbageEmoji:       { fontSize: 22, marginRight: 10, marginTop: 1 },
  viewMapHint:        { fontSize: 12, color: Green.primary, marginTop: 3, fontWeight: '600' },
  typeRow:            { flexDirection: 'row', gap: 8, marginBottom: 14 },
  typeBtn:            { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: Green.light, alignItems: 'center' },
  typeBtnActive:      { backgroundColor: Green.primary, borderColor: Green.primary },
  typeBtnText:        { fontSize: 12, fontWeight: '600', color: Green.primary },
  typeBtnTextActive:  { color: '#fff' },
  gcNote:             { backgroundColor: Green.surface, borderRadius: 8, padding: 10, marginBottom: 14 },
  gcNoteText:         { fontSize: 12, color: Green.dark },
  addStepBtn:         {
    borderWidth: 1.5,
    borderColor: Green.light,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginBottom: 4,
    borderStyle: 'dashed',
  },
  addStepText:        { color: Green.primary, fontWeight: '600', fontSize: 14 },
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
  todayDot:           { width: 5, height: 5, borderRadius: 3, backgroundColor: Green.secondary, marginTop: 3 },
  errorText:          { color: '#C62828', fontSize: 13, marginBottom: 10 },
  submitBtn:          { backgroundColor: Green.primary, borderRadius: 10, padding: 14, alignItems: 'center' },
  submitBtnDisabled:  { opacity: 0.6 },
  submitBtnText:      { color: Green.onPrimary, fontWeight: '700', fontSize: 15 },

  listContent:        { padding: 12 },
  dayHeader:          { backgroundColor: Green.light, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 6, marginTop: 8 },
  dayHeaderToday:     { backgroundColor: Green.primary },
  dayHeaderText:      { fontSize: 13, fontWeight: '700', color: Green.dark },
  dayHeaderTextToday: { color: '#fff' },
  emptyDayText:       { fontSize: 13, color: '#bbb', marginLeft: 12, marginBottom: 6 },

  taskCard:           { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8 },
  taskCardHeader:     { flexDirection: 'row', alignItems: 'flex-start' },
  taskCardInfo:       { flex: 1 },
  checkbox:           { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Green.primary, marginRight: 10, marginTop: 1, alignItems: 'center', justifyContent: 'center' },
  checkboxDone:       { backgroundColor: Green.primary },
  checkmark:          { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  taskTitle:          { fontSize: 14, color: '#222', fontWeight: '600' },
  taskTitleDone:      { color: '#aaa', textDecorationLine: 'line-through' },
  locationTag:        { fontSize: 12, color: '#888', marginTop: 3 },

  subtaskList:        { marginTop: 8, paddingLeft: 32, gap: 6 },
  subtaskReadRow:     { flexDirection: 'row', alignItems: 'center' },
  subtaskBox:         { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: Green.light, marginRight: 8, alignItems: 'center', justifyContent: 'center' },
  subtaskBoxDone:     { backgroundColor: Green.secondary, borderColor: Green.secondary },
  subtaskCheckmark:   { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  subtaskText:        { fontSize: 13, color: '#555' },
  subtaskTextDone:    { color: '#bbb', textDecorationLine: 'line-through' },
});
