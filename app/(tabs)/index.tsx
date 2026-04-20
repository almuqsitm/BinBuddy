import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { Green } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  type Task,
  type Subtask,
  getUserTasks,
  toggleTaskComplete,
  toggleSubtaskComplete,
  getJanitors,
  type User,
} from '@/lib/api';
import { getTodayISO, getWeekDates, getWeekRange } from '@/utils/dates';

// ─── Task item with optional subtasks ─────────────────────────────────────────

function TaskItem({
  task,
  onToggleTask,
  onToggleSubtask,
}: {
  task: Task;
  onToggleTask: (id: string) => void;
  onToggleSubtask: (taskId: string, subtask: Subtask) => void;
}) {
  const subtasks = task.subtasks ?? [];
  const hasSubtasks = subtasks.length > 0;
  const allDone = hasSubtasks && subtasks.every((s) => s.completed);
  const parentDisabled = hasSubtasks && !allDone;

  const sortedSubtasks = [...subtasks].sort((a, b) => a.order_index - b.order_index);

  return (
    <View style={styles.taskCard}>
      {/* Parent task row */}
      <TouchableOpacity
        style={styles.taskRow}
        onPress={() => !parentDisabled && onToggleTask(task.id)}
        disabled={parentDisabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.completed, disabled: parentDisabled }}
        accessibilityLabel={task.title}>
        <View style={[
          styles.checkbox,
          task.completed && styles.checkboxDone,
          parentDisabled && styles.checkboxLocked,
        ]}>
          {task.completed
            ? <Text style={styles.checkmark}>✓</Text>
            : parentDisabled
              ? <Text style={styles.lockIcon}>🔒</Text>
              : null}
        </View>
        <View style={styles.taskInfo}>
          <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]}>
            {task.title}
          </Text>
          {!!task.location && (
            <Text style={styles.locationTag}>📍 {task.location}</Text>
          )}
          {hasSubtasks && (
            <Text style={styles.progressText}>
              {subtasks.filter((s) => s.completed).length}/{subtasks.length} steps done
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Subtask rows */}
      {hasSubtasks && (
        <View style={styles.subtaskList}>
          {sortedSubtasks.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={styles.subtaskRow}
              onPress={() => onToggleSubtask(task.id, s)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: s.completed }}
              accessibilityLabel={s.title}>
              <View style={[styles.subtaskBox, s.completed && styles.subtaskBoxDone]}>
                {s.completed && <Text style={styles.subtaskCheckmark}>✓</Text>}
              </View>
              <Text style={[styles.subtaskText, s.completed && styles.subtaskTextDone]}>
                {s.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Janitor View ─────────────────────────────────────────────────────────────

function JanitorHome() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'today' | 'week'>('today');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const today = getTodayISO();
  const { from, to } = getWeekRange();

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const fromDate = tab === 'today' ? today : from;
    const toDate   = tab === 'today' ? today : to;
    getUserTasks(user.id, fromDate, toDate)
      .then(setTasks)
      .finally(() => setLoading(false));
  }, [tab, user]);

  const handleToggleTask = async (taskId: string) => {
    const updated = await toggleTaskComplete(taskId);
    setTasks((prev) =>
      prev.map((t) => (t.id === updated.id ? { ...t, completed: updated.completed } : t))
    );
  };

  const handleToggleSubtask = async (taskId: string, subtask: Subtask) => {
    const updatedSub = await toggleSubtaskComplete(subtask.id);

    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const newSubtasks = (t.subtasks ?? []).map((s) =>
          s.id === updatedSub.id ? updatedSub : s
        );
        const allNowDone = newSubtasks.every((s) => s.completed);
        const anyNowUndone = newSubtasks.some((s) => !s.completed);

        // Auto-complete parent when last subtask checked
        if (allNowDone && !t.completed) {
          toggleTaskComplete(t.id).then((updatedTask) => {
            setTasks((prev2) =>
              prev2.map((t2) =>
                t2.id === taskId ? { ...t2, completed: updatedTask.completed } : t2
              )
            );
          });
        }
        // Auto-uncomplete parent when any subtask unchecked
        if (anyNowUndone && t.completed) {
          toggleTaskComplete(t.id).then((updatedTask) => {
            setTasks((prev2) =>
              prev2.map((t2) =>
                t2.id === taskId ? { ...t2, completed: updatedTask.completed } : t2
              )
            );
          });
        }

        return { ...t, subtasks: newSubtasks };
      })
    );
  };

  const weekDates = getWeekDates();
  const incompleteTasks = tasks.filter((t) => !t.completed);
  const completedTasks  = tasks.filter((t) => t.completed);
  const byDate = weekDates.reduce<Record<string, Task[]>>((acc, { iso }) => {
    acc[iso] = tasks.filter((t) => t.due_date === iso);
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, tab === 'today' && styles.toggleBtnActive]}
          onPress={() => setTab('today')}>
          <Text style={[styles.toggleText, tab === 'today' && styles.toggleTextActive]}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, tab === 'week' && styles.toggleBtnActive]}
          onPress={() => setTab('week')}>
          <Text style={[styles.toggleText, tab === 'week' && styles.toggleTextActive]}>This Week</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={Green.primary} style={{ marginTop: 40 }} />
      ) : tab === 'today' ? (
        <ScrollView contentContainerStyle={styles.listContent}>
          {tasks.length === 0 ? (
            <Text style={styles.emptyText}>No tasks for today.</Text>
          ) : (
            <>
              {incompleteTasks.map((t) => (
                <TaskItem key={t.id} task={t} onToggleTask={handleToggleTask} onToggleSubtask={handleToggleSubtask} />
              ))}
              {completedTasks.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Completed</Text>
                  {completedTasks.map((t) => (
                    <TaskItem key={t.id} task={t} onToggleTask={handleToggleTask} onToggleSubtask={handleToggleSubtask} />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
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
                  <TaskItem key={t.id} task={t} onToggleTask={handleToggleTask} onToggleSubtask={handleToggleSubtask} />
                ))
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Supervisor View ───────────────────────────────────────────────────────────

function SupervisorHome() {
  const [janitors, setJanitors] = useState<User[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    getJanitors().then(setJanitors).finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.sectionHeading}>Your Janitors</Text>
      {loading ? (
        <ActivityIndicator color={Green.primary} style={{ marginTop: 40 }} />
      ) : janitors.length === 0 ? (
        <Text style={styles.emptyText}>No janitors registered yet.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {janitors.map((j) => (
            <TouchableOpacity
              key={j.id}
              style={styles.janitorRow}
              onPress={() =>
                router.push({
                  pathname: '/janitor/[id]' as any,
                  params: { id: j.id, name: `${j.first_name} ${j.last_name}` },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`View tasks for ${j.first_name} ${j.last_name}`}>
              <View style={styles.janitorAvatar}>
                <Text style={styles.janitorAvatarText}>
                  {j.first_name[0]}{j.last_name[0]}
                </Text>
              </View>
              <Text style={styles.janitorName}>{j.first_name} {j.last_name}</Text>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Root ──────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuth();
  return user?.role === 'supervisor' ? <SupervisorHome /> : <JanitorHome />;
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:               { flex: 1, backgroundColor: Green.surface },
  listContent:        { padding: 16 },

  toggleRow:          {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleBtn:          { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  toggleBtnActive:    { backgroundColor: Green.primary },
  toggleText:         { fontSize: 14, fontWeight: '600', color: Green.primary },
  toggleTextActive:   { color: Green.onPrimary },

  taskCard:           {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  taskRow:            { flexDirection: 'row', alignItems: 'flex-start' },
  taskInfo:           { flex: 1 },
  checkbox:           {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Green.primary,
    marginRight: 12,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone:       { backgroundColor: Green.primary },
  checkboxLocked:     { borderColor: '#CCC', backgroundColor: '#F5F5F5' },
  checkmark:          { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  lockIcon:           { fontSize: 11 },
  taskTitle:          { fontSize: 15, color: '#222', fontWeight: '600' },
  taskTitleDone:      { color: '#aaa', textDecorationLine: 'line-through' },
  locationTag:        { fontSize: 12, color: '#888', marginTop: 2 },
  progressText:       { fontSize: 11, color: Green.secondary, marginTop: 3, fontWeight: '600' },

  subtaskList:        { marginTop: 8, paddingLeft: 36, gap: 8 },
  subtaskRow:         { flexDirection: 'row', alignItems: 'center' },
  subtaskBox:         {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: Green.light,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskBoxDone:     { backgroundColor: Green.primary, borderColor: Green.primary },
  subtaskCheckmark:   { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  subtaskText:        { fontSize: 14, color: '#444' },
  subtaskTextDone:    { color: '#bbb', textDecorationLine: 'line-through' },

  dayHeader:          { backgroundColor: Green.light, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 8, marginTop: 8 },
  dayHeaderToday:     { backgroundColor: Green.primary },
  dayHeaderText:      { fontSize: 13, fontWeight: '700', color: Green.dark },
  dayHeaderTextToday: { color: '#fff' },
  emptyDayText:       { fontSize: 13, color: '#bbb', marginLeft: 4, marginBottom: 8 },

  sectionHeading:     { fontSize: 18, fontWeight: '700', color: Green.primary, margin: 16 },
  janitorRow:         {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  janitorAvatar:      { width: 40, height: 40, borderRadius: 20, backgroundColor: Green.light, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  janitorAvatarText:  { color: Green.dark, fontWeight: '700', fontSize: 14 },
  janitorName:        { flex: 1, fontSize: 16, fontWeight: '600', color: '#222' },
  chevron:            { fontSize: 22, color: Green.light },

  sectionLabel:       { fontSize: 12, fontWeight: '700', color: '#aaa', marginVertical: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 },
  emptyText:          { textAlign: 'center', color: '#aaa', fontSize: 15, marginTop: 60 },
});
