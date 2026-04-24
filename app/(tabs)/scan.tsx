import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Green } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import {
  type ScanMatch,
  type Task,
  getUserTasks,
  scanRoom,
  toggleTaskComplete,
} from '@/lib/api';
import { getTodayISO } from '@/utils/dates';

type Phase = 'idle' | 'live' | 'scanning' | 'results';

const SCAN_INTERVAL_MS = 5000;

export default function ScanScreen() {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();

  const [phase, setPhase]               = useState<Phase>('idle');
  const [tasks, setTasks]               = useState<Task[]>([]);
  const [capturedUri, setCapturedUri]   = useState<string | null>(null);
  const [matches, setMatches]           = useState<ScanMatch[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [toast, setToast]               = useState('');
  const [photoSize, setPhotoSize]       = useState({ w: 0, h: 0 });

  const cameraRef      = useRef<CameraView>(null);
  const phaseRef       = useRef<Phase>('idle');
  const isFocusedRef   = useRef(false);
  const intervalRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref to always hold the latest triggerScan — prevents stale closures inside the interval
  const triggerScanRef = useRef<() => void>(() => {});
  const pulseAnim      = useRef(new Animated.Value(1)).current;
  const overlayAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // Pulse dot animation
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  // Overlay fade: in on results, out otherwise
  useEffect(() => {
    Animated.timing(overlayAnim, {
      toValue: phase === 'results' || phase === 'scanning' ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [phase]);

  // Load tasks from today onwards
  useEffect(() => {
    if (!user) return;
    getUserTasks(user.id, getTodayISO()).then(setTasks).catch(() => {});
  }, [user]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const startInterval = useCallback(() => {
    stopInterval();
    intervalRef.current = setInterval(() => {
      // Always call via ref so we get the latest closure (avoids stale tasks/completedIds)
      if (phaseRef.current === 'live') triggerScanRef.current();
    }, SCAN_INTERVAL_MS);
  }, [stopInterval]);

  // ── Tab focus management — stop all API calls when user leaves this tab ──────
  useFocusEffect(useCallback(() => {
    isFocusedRef.current = true;
    if (permission?.granted) setPhase('live');
    return () => {
      isFocusedRef.current = false;
      stopInterval();
      setPhase('idle');
    };
  }, [permission?.granted, stopInterval]));

  // If permission is granted while the tab is already focused (e.g. after prompt)
  useEffect(() => {
    if (permission?.granted && isFocusedRef.current) setPhase('live');
  }, [permission?.granted]);

  // Drive interval from phase
  useEffect(() => {
    if (phase === 'live') startInterval();
    else stopInterval();
  }, [phase]);

  // Cleanup on unmount
  useEffect(() => () => stopInterval(), []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const triggerScan = useCallback(async () => {
    if (phaseRef.current === 'scanning') return;
    if (!cameraRef.current) return;

    stopInterval();

    // Only send tasks that are still incomplete (including session completions)
    const incompleteTasks = tasks.filter((t) => !t.completed && !completedIds.has(t.id));

    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.5 });
      if (!photo?.base64 || !photo.uri) throw new Error('No photo');

      setCapturedUri(photo.uri);
      setPhase('scanning');

      const result = await scanRoom(photo.base64, incompleteTasks);
      setMatches(result.matches);

      if (result.matches.length > 0) {
        // Stay in results — image persists until the janitor taps Scan Now again
        setPhase('results');
      } else {
        showToast('Nothing detected — keep scanning');
        setPhase('live');
        startInterval();
      }
    } catch {
      setPhase('live');
      startInterval();
    }
  }, [tasks, completedIds, startInterval, stopInterval]);

  // Keep the ref current so the interval always calls the latest version
  useEffect(() => { triggerScanRef.current = triggerScan; }, [triggerScan]);

  const handleMarkDone = async (taskId: string) => {
    try {
      await toggleTaskComplete(taskId);
      setCompletedIds((prev) => new Set(prev).add(taskId));
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: true } : t)));
    } catch {
      // non-fatal
    }
  };

  const handlePhotoLayout = (e: LayoutChangeEvent) => {
    setPhotoSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  };

  // ── Permission screens ─────────────────────────────────────────────────────

  if (!permission) {
    return <View style={styles.center}><ActivityIndicator color={Green.primary} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permBody}>
          BinBuddy needs the camera to scan your room and match objects to your tasks.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Main camera UI ─────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>

      {/* Live camera — always rendered while screen is mounted */}
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      {/* Frozen frame + nodes (fades in over live feed during scanning/results) */}
      {capturedUri && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: overlayAnim }]}
          pointerEvents={phase === 'results' ? 'box-none' : 'none'}>
          <View style={StyleSheet.absoluteFill} onLayout={handlePhotoLayout}>
            <Image source={{ uri: capturedUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />

            {/* Spinner while analyzing */}
            {phase === 'scanning' && (
              <View style={styles.scanningOverlay}>
                <ActivityIndicator color="#fff" size="large" />
                <Text style={styles.scanningText}>Analyzing…</Text>
              </View>
            )}

            {/* Detection nodes — only for incomplete tasks */}
            {phase === 'results' && photoSize.w > 0 && matches.map((m, i) => {
              const done   = completedIds.has(m.task_id);
              const left   = m.x_percent * photoSize.w;
              const top    = m.y_percent * photoSize.h;
              const flipUp = m.y_percent > 0.72;
              return (
                <View key={i} style={[styles.nodeWrap, { left: left - 9, top: top - 9 }]}>
                  <View style={[styles.pin, done && styles.pinDone]} />
                  <View style={[styles.card, flipUp ? styles.cardAbove : styles.cardBelow]}>
                    <Text style={styles.cardObject}>{m.object_label}</Text>
                    <Text style={styles.cardTask}>{m.task_title}</Text>
                    {done ? (
                      <Text style={styles.doneText}>✅ Done</Text>
                    ) : (
                      <TouchableOpacity
                        style={styles.markDoneBtn}
                        onPress={() => handleMarkDone(m.task_id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Mark ${m.task_title} as done`}>
                        <Text style={styles.markDoneText}>Mark Done</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>
      )}

      {/* Pulsing dot — visible while actively scanning (live or mid-request) */}
      {(phase === 'live' || phase === 'scanning') && (
        <Animated.View style={[styles.pulseDot, { opacity: pulseAnim }]} />
      )}

      {/* Bottom action button */}
      {phase === 'live' && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.scanBtn}
            onPress={triggerScan}
            accessibilityRole="button"
            accessibilityLabel="Scan room now">
            <Text style={styles.scanBtnText}>Scan Now</Text>
          </TouchableOpacity>
        </View>
      )}
      {phase === 'scanning' && (
        <View style={styles.bottomBar}>
          <View style={[styles.scanBtn, styles.scanBtnDisabled]}>
            <Text style={styles.scanBtnText}>Scanning…</Text>
          </View>
        </View>
      )}
      {phase === 'results' && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.resumeBtn}
            onPress={() => setPhase('live')}
            accessibilityRole="button"
            accessibilityLabel="Resume scanning">
            <Text style={styles.resumeBtnText}>Resume</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Toast for empty results */}
      {!!toast && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: '#111' },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: Green.surface },

  permTitle:       { fontSize: 18, fontWeight: '700', color: Green.dark, marginBottom: 10, textAlign: 'center' },
  permBody:        { fontSize: 14, color: '#555', textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  permBtn:         { backgroundColor: Green.primary, paddingHorizontal: 28, paddingVertical: 13, borderRadius: 12 },
  permBtnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },

  scanningOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', gap: 14 },
  scanningText:    { color: '#fff', fontSize: 16, fontWeight: '600' },

  nodeWrap:        { position: 'absolute', alignItems: 'center' },
  pin:             { width: 18, height: 18, borderRadius: 9, backgroundColor: Green.primary, borderWidth: 2.5, borderColor: '#fff', zIndex: 2 },
  pinDone:         { backgroundColor: Green.secondary },
  card:            { position: 'absolute', backgroundColor: '#fff', borderRadius: 10, padding: 10, minWidth: 140, maxWidth: 180, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 6, zIndex: 1 },
  cardBelow:       { top: 22 },
  cardAbove:       { bottom: 22 },
  cardObject:      { fontSize: 10, color: '#999', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  cardTask:        { fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 8 },
  markDoneBtn:     { backgroundColor: Green.primary, borderRadius: 7, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  markDoneText:    { color: '#fff', fontSize: 12, fontWeight: '700' },
  doneText:        { fontSize: 13, fontWeight: '600', color: Green.secondary },

  pulseDot:        { position: 'absolute', top: 16, right: 16, width: 12, height: 12, borderRadius: 6, backgroundColor: Green.primary, borderWidth: 2, borderColor: '#fff' },

  bottomBar:       { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  scanBtn:         { backgroundColor: Green.primary, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 },
  scanBtnDisabled: { opacity: 0.55 },
  scanBtnText:     { color: '#fff', fontSize: 16, fontWeight: '700' },
  resumeBtn:       { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 2, borderColor: '#fff', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 30 },
  resumeBtnText:   { color: '#fff', fontSize: 16, fontWeight: '700' },

  toast:           { position: 'absolute', bottom: 110, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.72)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  toastText:       { color: '#fff', fontSize: 13, fontWeight: '500' },
});
