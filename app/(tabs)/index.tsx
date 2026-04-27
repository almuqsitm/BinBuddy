import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

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
import { getTodayISO, getWeekDates, getWeekRange, getWeekLabel, formatWeekRange } from '@/utils/dates';
import VoiceAssistantModal from '@/components/VoiceAssistantModal';

// ─── Task item with optional subtasks ─────────────────────────────────────────

function TaskItem({
  task,
  onToggleTask,
  onToggleSubtask,
  prominent = false,
}: {
  task: Task;
  onToggleTask: (id: string) => void;
  onToggleSubtask: (taskId: string, subtask: Subtask) => void;
  prominent?: boolean;
}) {
  const isGarbage = task.task_type === 'garbage_collection';
  const subtasks = task.subtasks ?? [];
  const hasSubtasks = subtasks.length > 0;
  const allDone = hasSubtasks && subtasks.every((s) => s.completed);
  const parentDisabled = hasSubtasks && !allDone;

  const sortedSubtasks = [...subtasks].sort((a, b) => a.order_index - b.order_index);

  if (isGarbage) {
    return (
      <TouchableOpacity
        style={[styles.taskCard, prominent && styles.taskCardProminent, styles.taskCardGarbage]}
        onPress={() => router.push({ pathname: '/garbage-map/[task_id]' as any, params: { task_id: task.id, task_title: task.title } })}
        accessibilityRole="button"
        accessibilityLabel={`Open garbage map for ${task.title}`}>
        <View style={styles.taskRow}>
          <Text style={[styles.garbageEmoji, prominent && styles.garbageEmojiProminent]}>
            {task.completed ? '✅' : '🗑️'}
          </Text>
          <View style={styles.taskInfo}>
            <Text style={[styles.taskTitle, prominent && styles.taskTitleProminent, task.completed && styles.taskTitleDone]}>
              {task.title}
            </Text>
            {!!task.location && <Text style={[styles.locationTag, prominent && styles.locationTagProminent]}>📍 {task.location}</Text>}
            <Text style={[styles.progressText, prominent && styles.progressTextProminent]}>
              {task.completed ? 'All garbage collected' : 'Tap to open floor map'}
            </Text>
          </View>
          <Text style={styles.mapArrow}>›</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.taskCard, prominent && styles.taskCardProminent]}>
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
          prominent && styles.checkboxProminent,
          task.completed && styles.checkboxDone,
          parentDisabled && styles.checkboxLocked,
        ]}>
          {task.completed
            ? <Text style={[styles.checkmark, prominent && styles.checkmarkProminent]}>✓</Text>
            : parentDisabled
              ? <Text style={styles.lockIcon}>🔒</Text>
              : null}
        </View>
        <View style={styles.taskInfo}>
          <Text style={[
            styles.taskTitle,
            prominent && styles.taskTitleProminent,
            task.completed && styles.taskTitleDone,
          ]}>
            {task.title}
          </Text>
          {!!task.location && (
            <Text style={[styles.locationTag, prominent && styles.locationTagProminent]}>
              📍 {task.location}
            </Text>
          )}
          {hasSubtasks && (
            <Text style={[styles.progressText, prominent && styles.progressTextProminent]}>
              {subtasks.filter((s) => s.completed).length}/{subtasks.length} steps done
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Subtask rows */}
      {hasSubtasks && (
        <View style={[styles.subtaskList, prominent && styles.subtaskListProminent]}>
          {sortedSubtasks.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.subtaskRow, prominent && styles.subtaskRowProminent]}
              onPress={() => onToggleSubtask(task.id, s)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: s.completed }}
              accessibilityLabel={s.title}>
              <View style={[
                styles.subtaskBox,
                prominent && styles.subtaskBoxProminent,
                s.completed && styles.subtaskBoxDone,
              ]}>
                {s.completed && <Text style={[styles.subtaskCheckmark, prominent && styles.subtaskCheckmarkProminent]}>✓</Text>}
              </View>
              <Text style={[
                styles.subtaskText,
                prominent && styles.subtaskTextProminent,
                s.completed && styles.subtaskTextDone,
              ]}>
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
  const [weekOffset, setWeekOffset] = useState(0);

  const today = getTodayISO();
  const { from, to } = getWeekRange(weekOffset);

  const loadTasks = useCallback((showSpinner = true) => {
    if (!user) return;
    if (showSpinner) setLoading(true);
    const fromDate = tab === 'today' ? today : from;
    const toDate   = tab === 'today' ? today : to;
    getUserTasks(user.id, fromDate, toDate)
      .then(setTasks)
      .finally(() => setLoading(false));
  }, [user, tab, today, from, to]);

  // Initial load + reload when tab/week changes
  useEffect(() => { loadTasks(); }, [tab, user, weekOffset]);

  // Silent refresh when screen regains focus (e.g. returning from garbage map)
  useFocusEffect(useCallback(() => { loadTasks(false); }, [loadTasks]));

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

  const [showAllTasks, setShowAllTasks]         = useState(false);
  const [showCompleted, setShowCompleted]       = useState(false);
  const [assistantVisible, setAssistantVisible] = useState(false);

  const handleVoiceTaskComplete = (taskId: string) => {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: true } : t)));
  };

  const handleVoiceSubtaskComplete = (subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        const newSubtasks = (t.subtasks ?? []).map((s) =>
          s.id === subtaskId ? { ...s, completed: true } : s
        );
        const allNowDone = newSubtasks.every((s) => s.completed);
        if (allNowDone && !t.completed) {
          toggleTaskComplete(t.id).then((updated) => {
            setTasks((p) => p.map((tt) => (tt.id === t.id ? { ...tt, completed: updated.completed } : tt)));
          });
        }
        return { ...t, subtasks: newSubtasks };
      })
    );
  };

  const weekDates = getWeekDates(weekOffset);
  const incompleteTasks = tasks.filter((t) => !t.completed);
  const completedTasks  = tasks.filter((t) => t.completed);
  const visibleTasks    = showAllTasks ? incompleteTasks : incompleteTasks.slice(0, 2);
  const hiddenCount     = incompleteTasks.length - 2;
  const byDate = weekDates.reduce<Record<string, Task[]>>((acc, { iso }) => {
    acc[iso] = tasks.filter((t) => t.due_date === iso);
    return acc;
  }, {});

  return (
    <View style={{ flex: 1 }}>
    <SafeAreaView style={styles.safe}>
      <VoiceAssistantModal
        visible={assistantVisible}
        onClose={() => setAssistantVisible(false)}
        tasks={tasks}
        onTaskCompleted={handleVoiceTaskComplete}
        onSubtaskCompleted={handleVoiceSubtaskComplete}
      />
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
              {visibleTasks.map((t, i) => (
                <TaskItem key={t.id} task={t} onToggleTask={handleToggleTask} onToggleSubtask={handleToggleSubtask} prominent={i < 2} />
              ))}

              {/* Show more / show less */}
              {incompleteTasks.length > 2 && (
                <TouchableOpacity
                  style={styles.showMoreBtn}
                  onPress={() => setShowAllTasks((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={showAllTasks ? 'Show fewer tasks' : `Show ${hiddenCount} more tasks`}>
                  <Text style={styles.showMoreText}>
                    {showAllTasks ? '↑ Show less' : `↓ ${hiddenCount} more task${hiddenCount !== 1 ? 's' : ''}`}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Completed section (collapsed by default) */}
              {completedTasks.length > 0 && (
                <>
                  <TouchableOpacity
                    style={styles.completedHeader}
                    onPress={() => setShowCompleted((v) => !v)}
                    accessibilityRole="button"
                    accessibilityLabel={showCompleted ? 'Hide completed tasks' : 'Show completed tasks'}>
                    <Text style={styles.completedHeaderText}>
                      {showCompleted ? '▾' : '▸'} Completed ({completedTasks.length})
                    </Text>
                  </TouchableOpacity>
                  {showCompleted && completedTasks.map((t) => (
                    <TaskItem key={t.id} task={t} onToggleTask={handleToggleTask} onToggleSubtask={handleToggleSubtask} />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      ) : (
        <>
        <View style={styles.weekNavRow}>
          <TouchableOpacity
            style={styles.weekNavBtn}
            onPress={() => setWeekOffset((o) => o - 1)}
            accessibilityRole="button"
            accessibilityLabel="Previous week">
            <Text style={styles.weekNavArrow}>‹</Text>
          </TouchableOpacity>
          <View style={styles.weekNavCenter}>
            <Text style={styles.weekNavLabel}>{getWeekLabel(weekOffset)}</Text>
            <Text style={styles.weekNavRange}>{formatWeekRange(weekOffset)}</Text>
          </View>
          <TouchableOpacity
            style={styles.weekNavBtn}
            onPress={() => setWeekOffset((o) => o + 1)}
            accessibilityRole="button"
            accessibilityLabel="Next week">
            <Text style={styles.weekNavArrow}>›</Text>
          </TouchableOpacity>
        </View>
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
        </>
      )}
    </SafeAreaView>

    {/* Floating mic button */}
    <TouchableOpacity
      style={styles.fab}
      onPress={() => setAssistantVisible(true)}
      accessibilityRole="button"
      accessibilityLabel="Open voice assistant"
      accessibilityHint="Ask a question about your tasks by speaking">
      <Text style={styles.fabIcon}>🎤</Text>
    </TouchableOpacity>
    </View>
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
  taskCardGarbage:    { borderLeftColor: '#E53935' },
  garbageEmoji:       { fontSize: 22, marginRight: 12, marginTop: 1 },
  garbageEmojiProminent: { fontSize: 30, marginRight: 14, marginTop: 2 },
  mapArrow:           { fontSize: 24, color: Green.light, marginLeft: 4 },
  taskCardProminent:  {
    padding: 18,
    borderRadius: 16,
    borderLeftWidth: 5,
    borderLeftColor: Green.primary,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 12,
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
  checkboxProminent:  { width: 32, height: 32, borderRadius: 16, borderWidth: 2.5, marginRight: 14, marginTop: 2 },
  checkboxDone:       { backgroundColor: Green.primary },
  checkboxLocked:     { borderColor: '#CCC', backgroundColor: '#F5F5F5' },
  checkmark:          { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  checkmarkProminent: { fontSize: 17 },
  lockIcon:           { fontSize: 11 },
  taskTitle:          { fontSize: 15, color: '#222', fontWeight: '600' },
  taskTitleProminent: { fontSize: 20, fontWeight: '700', color: Green.dark },
  taskTitleDone:      { color: '#aaa', textDecorationLine: 'line-through' },
  locationTag:        { fontSize: 12, color: '#888', marginTop: 2 },
  locationTagProminent: { fontSize: 14, marginTop: 4 },
  progressText:       { fontSize: 11, color: Green.secondary, marginTop: 3, fontWeight: '600' },
  progressTextProminent: { fontSize: 13, marginTop: 5 },

  subtaskList:        { marginTop: 8, paddingLeft: 36, gap: 8 },
  subtaskListProminent: { marginTop: 12, paddingLeft: 46, gap: 12 },
  subtaskRow:         { flexDirection: 'row', alignItems: 'center' },
  subtaskRowProminent: { paddingVertical: 2 },
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
  subtaskBoxProminent: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, marginRight: 12 },
  subtaskBoxDone:     { backgroundColor: Green.primary, borderColor: Green.primary },
  subtaskCheckmark:   { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  subtaskCheckmarkProminent: { fontSize: 13 },
  subtaskText:        { fontSize: 14, color: '#444' },
  subtaskTextProminent: { fontSize: 16, color: '#333' },
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

  showMoreBtn:        {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: Green.light,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  showMoreText:       { color: Green.primary, fontWeight: '600', fontSize: 14 },
  completedHeader:    {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 8,
  },
  completedHeaderText: { fontSize: 13, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionLabel:       { fontSize: 12, fontWeight: '700', color: '#aaa', marginVertical: 8, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 },
  emptyText:          { textAlign: 'center', color: '#aaa', fontSize: 15, marginTop: 60 },

  weekNavRow:     {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  weekNavBtn:     { padding: 12 },
  weekNavArrow:   { fontSize: 26, color: Green.primary, fontWeight: '600' },
  weekNavCenter:  { flex: 1, alignItems: 'center' },
  weekNavLabel:   { fontSize: 15, fontWeight: '700', color: Green.dark },
  weekNavRange:   { fontSize: 12, color: '#888', marginTop: 1 },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Green.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: { fontSize: 28 },
});
