import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { Green } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  type GarbagePoint,
  getOrGenerateGarbagePoints,
  collectGarbagePoint,
  toggleTaskComplete,
} from '@/lib/api';

// ─── Floor plan layout (% of map dimensions) ─────────────────────────────────

const ROOMS = [
  { id: 'entrance',  label: 'Entrance',     x: 0,  y: 0,  w: 100, h: 13 },
  { id: 'office',    label: 'Office',        x: 0,  y: 16, w: 46,  h: 35 },
  { id: 'meeting',   label: 'Meeting Room',  x: 54, y: 16, w: 46,  h: 35 },
  { id: 'breakroom', label: 'Break Room',    x: 0,  y: 54, w: 46,  h: 35 },
  { id: 'bathroom',  label: 'Bathroom',      x: 54, y: 54, w: 46,  h: 35 },
  { id: 'corridor',  label: 'Corridor',      x: 0,  y: 92, w: 100, h: 8  },
];

const ICON_SIZE = 44;
const { width: SCREEN_W } = Dimensions.get('window');
const MAP_W = SCREEN_W - 32;
const MAP_H = MAP_W * 1.38;

// ─── Animated garbage icon ────────────────────────────────────────────────────

function GarbageIcon({
  point,
  interactive,
  onCollect,
}: {
  point: GarbagePoint;
  interactive: boolean;
  onCollect: (id: string) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (point.collected || !interactive) return;
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.45, useNativeDriver: true, speed: 80, bounciness: 6 }),
      Animated.spring(scale, { toValue: 1.0,  useNativeDriver: true, speed: 20, bounciness: 0 }),
    ]).start(() => onCollect(point.id));
  };

  const left = point.x_percent * MAP_W - ICON_SIZE / 2;
  const top  = point.y_percent * MAP_H - ICON_SIZE / 2;

  return (
    <Animated.View style={[styles.iconWrapper, { left, top, transform: [{ scale }] }]}>
      <TouchableOpacity
        onPress={handlePress}
        disabled={point.collected || !interactive}
        style={[styles.iconBtn, point.collected && styles.iconBtnDone]}
        accessibilityRole="button"
        accessibilityLabel={
          point.collected ? `${point.label} — collected` : `Collect garbage at ${point.label}`
        }
        accessibilityState={{ disabled: point.collected || !interactive }}>
        <Text style={styles.iconEmoji}>{point.collected ? '✓' : '🗑️'}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GarbageMapScreen() {
  const { user } = useAuth();
  const { task_id, task_title } = useLocalSearchParams<{ task_id: string; task_title: string }>();

  const isSupervisor = user?.role === 'supervisor';

  const [points, setPoints]         = useState<GarbagePoint[]>([]);
  const [loading, setLoading]       = useState(true);
  const [completing, setCompleting] = useState(false);
  const taskCompletedRef            = useRef(false);

  useEffect(() => {
    if (!task_id) return;
    getOrGenerateGarbagePoints(task_id)
      .then((pts) => {
        setPoints(pts);
        if (pts.every((p) => p.collected)) taskCompletedRef.current = true;
      })
      .finally(() => setLoading(false));
  }, [task_id]);

  // Auto-complete task when last point collected
  useEffect(() => {
    if (
      !isSupervisor &&
      points.length > 0 &&
      points.every((p) => p.collected) &&
      !taskCompletedRef.current &&
      task_id
    ) {
      taskCompletedRef.current = true;
      setCompleting(true);
      toggleTaskComplete(task_id).finally(() => setCompleting(false));
    }
  }, [points]);

  const handleCollect = async (pointId: string) => {
    if (!user || isSupervisor) return;
    const updated = await collectGarbagePoint(pointId, user.id);
    setPoints((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const collectedCount = points.filter((p) => p.collected).length;
  const allDone        = points.length > 0 && collectedCount === points.length;
  const progress       = points.length > 0 ? collectedCount / points.length : 0;

  const collectedPoints = points
    .filter((p) => p.collected && p.collected_at)
    .sort((a, b) => (a.collected_at! > b.collected_at! ? -1 : 1));

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {task_title || 'Garbage Collection'}
        </Text>
        <Text style={styles.counter}>{collectedCount}/{points.length}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%` as any }]} />
      </View>

      {loading ? (
        <ActivityIndicator color={Green.primary} size="large" style={{ marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Completion banner */}
          {allDone && (
            <View style={styles.completeBanner}>
              <Text style={styles.completeBannerText}>
                {completing ? '⏳ Marking task complete…' : '✅ All garbage collected!'}
              </Text>
            </View>
          )}

          {/* Instruction (janitor only) */}
          {!isSupervisor && !allDone && (
            <Text style={styles.instruction}>Tap 🗑️ to mark garbage as collected</Text>
          )}
          {isSupervisor && (
            <Text style={styles.instruction}>Viewing progress — {collectedCount} of {points.length} locations collected</Text>
          )}

          {/* Floor map */}
          <View style={[styles.mapContainer, { width: MAP_W, height: MAP_H }]}>
            {ROOMS.map((room) => (
              <View
                key={room.id}
                style={[styles.room, {
                  left:   (room.x / 100) * MAP_W,
                  top:    (room.y / 100) * MAP_H,
                  width:  (room.w / 100) * MAP_W,
                  height: (room.h / 100) * MAP_H,
                }]}>
                <Text style={styles.roomLabel} numberOfLines={1}>{room.label}</Text>
              </View>
            ))}
            {points.map((point) => (
              <GarbageIcon
                key={point.id}
                point={point}
                interactive={!isSupervisor}
                onCollect={handleCollect}
              />
            ))}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#E53935' }]} />
              <Text style={styles.legendText}>Needs collection</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Green.primary }]} />
              <Text style={styles.legendText}>Collected</Text>
            </View>
          </View>

          {/* Collection log — supervisors only */}
          {isSupervisor && collectedPoints.length > 0 && (
            <View style={styles.logSection}>
              <Text style={styles.logTitle}>Collection Log</Text>
              {collectedPoints.map((p) => (
                <View key={p.id} style={styles.logRow}>
                  <View style={styles.logLeft}>
                    <Text style={styles.logLabel}>📍 {p.label}</Text>
                    {p.collector && (
                      <Text style={styles.logCollector}>
                        {p.collector.first_name} {p.collector.last_name}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.logTime}>
                    {new Date(p.collected_at!).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen:             { flex: 1, backgroundColor: Green.surface },

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
  headerTitle:        { flex: 1, color: '#fff', fontSize: 17, fontWeight: '700' },
  counter:            { color: '#fff', fontSize: 16, fontWeight: '700', marginLeft: 8 },

  progressBarBg:      { height: 6, backgroundColor: Green.light },
  progressBarFill:    { height: 6, backgroundColor: Green.primary },

  scrollContent:      { padding: 16, alignItems: 'center' },

  completeBanner:     {
    backgroundColor: Green.primary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    width: '100%',
  },
  completeBannerText: { color: '#fff', fontWeight: '700', fontSize: 15, textAlign: 'center' },
  instruction:        { fontSize: 13, color: '#888', marginBottom: 12, alignSelf: 'flex-start' },

  mapContainer:       {
    position: 'relative',
    backgroundColor: '#F0EDE8',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#CCC',
  },
  room:               {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#8D6E63',
    backgroundColor: '#FFF8F0',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 4,
  },
  roomLabel:          { fontSize: 10, fontWeight: '700', color: '#8D6E63', textTransform: 'uppercase', letterSpacing: 0.5 },

  iconWrapper:        { position: 'absolute', width: ICON_SIZE, height: ICON_SIZE },
  iconBtn:            {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    backgroundColor: '#FFEBEE',
    borderWidth: 2,
    borderColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  iconBtnDone:        { backgroundColor: Green.surface, borderColor: Green.primary },
  iconEmoji:          { fontSize: 20 },

  legend:             { flexDirection: 'row', gap: 20, marginTop: 14, alignSelf: 'flex-start' },
  legendItem:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot:          { width: 12, height: 12, borderRadius: 6 },
  legendText:         { fontSize: 12, color: '#666' },

  logSection:         { width: '100%', marginTop: 20 },
  logTitle:           { fontSize: 15, fontWeight: '700', color: Green.dark, marginBottom: 10 },
  logRow:             {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  logLeft:            { flex: 1 },
  logLabel:           { fontSize: 13, color: '#333', fontWeight: '600' },
  logCollector:       { fontSize: 12, color: '#888', marginTop: 2 },
  logTime:            { fontSize: 13, color: Green.primary, fontWeight: '700', marginLeft: 8 },
});
