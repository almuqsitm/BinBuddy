import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Green } from '@/constants/theme';
import {
  type Task,
  type VoiceAction,
  speakText,
  toggleSubtaskComplete,
  toggleTaskComplete,
  transcribeAudio,
  voiceChat,
} from '@/lib/api';

type Phase = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking' | 'error';

type Props = {
  visible: boolean;
  onClose: () => void;
  tasks: Task[];
  onTaskCompleted: (taskId: string) => void;
  onSubtaskCompleted: (subtaskId: string) => void;
};

const PHASE_LABEL: Record<Phase, string> = {
  idle:         'Tap to start speaking',
  recording:    'Listening…',
  transcribing: 'Transcribing…',
  thinking:     'Thinking…',
  speaking:     'Speaking…',
  error:        'Something went wrong',
};

// Different durations per bar so they naturally desync → waveform feel
const BAR_DURATIONS = [320, 260, 400, 290, 370];
const BAR_COUNT = BAR_DURATIONS.length;

const SILENCE_THRESHOLD_DB = -38;
const SILENCE_FRAMES_REQUIRED = 12; // ~2.4s at 200ms intervals

export default function VoiceAssistantModal({
  visible,
  onClose,
  tasks,
  onTaskCompleted,
  onSubtaskCompleted,
}: Props) {
  const [phase, setPhase]           = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [reply, setReply]           = useState('');
  const [errorMsg, setErrorMsg]     = useState('');

  const recordingRef    = useRef<Audio.Recording | null>(null);
  const soundRef        = useRef<Audio.Sound | null>(null);
  const isRecordingRef  = useRef(false);
  const silenceCountRef = useRef(0);
  const animationsRef   = useRef<Animated.CompositeAnimation[]>([]);
  const barScales       = useRef(
    Array.from({ length: BAR_COUNT }, () => new Animated.Value(0.15))
  ).current;

  // ── Bar animation ────────────────────────────────────────────────────────────

  const stopBars = () => {
    animationsRef.current.forEach((a) => a.stop());
    animationsRef.current = [];
    barScales.forEach((s) => s.setValue(0.15));
  };

  const startBars = (fast: boolean) => {
    stopBars();
    animationsRef.current = barScales.map((scale, i) => {
      const dur = fast ? BAR_DURATIONS[i] : BAR_DURATIONS[i] * 3;
      const peak = fast ? 1 : 0.5;
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: peak, duration: dur, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.15, duration: dur, useNativeDriver: true }),
        ])
      );
      anim.start();
      return anim;
    });
  };

  useEffect(() => {
    if (phase === 'recording') {
      startBars(true);
    } else if (phase === 'speaking') {
      startBars(true);
    } else if (phase === 'transcribing' || phase === 'thinking') {
      startBars(false);
    } else {
      stopBars();
    }
    return stopBars;
  }, [phase]);

  // ── Permissions + reset on open ─────────────────────────────────────────────

  useEffect(() => {
    if (!visible) return;
    setPhase('idle');
    setTranscript('');
    setReply('');
    setErrorMsg('');
    Audio.requestPermissionsAsync().then(({ granted }) => {
      if (!granted) {
        setPhase('error');
        setErrorMsg('Microphone permission is required.');
      }
    });
  }, [visible]);

  // Stop audio + bars when modal closes
  useEffect(() => {
    if (!visible) {
      isRecordingRef.current = false;
      soundRef.current?.stopAsync().catch(() => {});
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
      stopBars();
    }
  }, [visible]);

  // ── TTS via Deepgram Aura, fallback to device speech ────────────────────────

  const playReply = async (text: string) => {
    try {
      const { audio } = await speakText(text);
      const uri = FileSystem.cacheDirectory + 'binbuddy_reply.mp3';
      await FileSystem.writeAsStringAsync(uri, audio, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync({ uri });
      soundRef.current = sound;
      setPhase('speaking');
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPhase('idle');
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
        }
      });
      await sound.playAsync();
    } catch {
      // Fallback to device TTS if Deepgram TTS fails
      setPhase('speaking');
      Speech.speak(text, {
        language: 'en-US',
        rate: 0.9,
        onDone: () => setPhase('idle'),
        onError: () => setPhase('idle'),
      });
    }
  };

  // ── Recording with silence detection ────────────────────────────────────────

  const finishRecording = async (recording: Audio.Recording) => {
    isRecordingRef.current = false;
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      recordingRef.current = null;
      if (!uri) throw new Error('No audio recorded.');

      setPhase('transcribing');
      const { transcript: text } = await transcribeAudio(uri);
      setTranscript(text);

      setPhase('thinking');
      const { reply: answer, action } = await voiceChat(text, tasks);
      setReply(answer);

      await handleAction(action);
      await playReply(answer);
    } catch (e: any) {
      setPhase('error');
      setErrorMsg(e.message ?? 'Something went wrong.');
    }
  };

  const handleMicPress = async () => {
    if (phase === 'idle') {
      try {
        silenceCountRef.current = 0;
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(
          { ...Audio.RecordingOptionsPresets.HIGH_QUALITY, isMeteringEnabled: true },
          (status) => {
            if (!isRecordingRef.current) return;
            if (status.isRecording && status.metering !== undefined) {
              if (status.metering < SILENCE_THRESHOLD_DB) {
                silenceCountRef.current++;
                if (silenceCountRef.current >= SILENCE_FRAMES_REQUIRED) {
                  isRecordingRef.current = false;
                  finishRecording(recording);
                }
              } else {
                silenceCountRef.current = 0;
              }
            }
          },
          200,
        );
        recordingRef.current = recording;
        isRecordingRef.current = true;
        setPhase('recording');
      } catch (e: any) {
        setPhase('error');
        setErrorMsg('Could not start recording.');
      }
      return;
    }

    if (phase === 'recording' && recordingRef.current) {
      const recording = recordingRef.current;
      isRecordingRef.current = false;
      finishRecording(recording);
    }
  };

  const handleAction = async (action: VoiceAction) => {
    if (!action) return;
    try {
      if (action.type === 'complete_task') {
        await toggleTaskComplete(action.id);
        onTaskCompleted(action.id);
      } else if (action.type === 'complete_subtask') {
        await toggleSubtaskComplete(action.id);
        onSubtaskCompleted(action.id);
      }
    } catch {
      // Non-fatal
    }
  };

  const speakAgain = async () => {
    if (!reply) return;
    await playReply(reply);
  };

  const isProcessing = phase === 'transcribing' || phase === 'thinking';
  const barColor =
    phase === 'recording'  ? '#E53935' :
    isProcessing           ? '#9E9E9E' :
    Green.primary;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>BinBuddy Assistant</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close assistant">
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Waveform bars + tap target */}
        <TouchableOpacity
          style={styles.waveArea}
          onPress={handleMicPress}
          disabled={isProcessing || phase === 'speaking'}
          accessibilityRole="button"
          accessibilityLabel={phase === 'recording' ? 'Stop recording' : 'Start recording'}
          accessibilityHint="Double tap to start recording. Double tap again to stop.">
          <View style={styles.barsRow}>
            {barScales.map((scale, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.bar,
                  { backgroundColor: barColor, transform: [{ scaleY: scale }] },
                ]}
              />
            ))}
          </View>
          {isProcessing && (
            <ActivityIndicator color={Green.primary} style={styles.spinner} />
          )}
          <Text style={styles.phaseLabel}>{PHASE_LABEL[phase]}</Text>
          {phase === 'error' && (
            <Text style={styles.errorText}>{errorMsg}</Text>
          )}
        </TouchableOpacity>

        {/* Transcript */}
        {!!transcript && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>You said</Text>
            <Text style={styles.cardBody}>{transcript}</Text>
          </View>
        )}

        {/* Reply */}
        {!!reply && (
          <View style={[styles.card, styles.replyCard]} accessibilityLiveRegion="polite">
            <Text style={[styles.cardLabel, styles.replyLabel]}>BinBuddy</Text>
            <Text style={styles.cardBody}>{reply}</Text>
            {phase !== 'speaking' && (
              <TouchableOpacity
                onPress={speakAgain}
                style={styles.speakAgainBtn}
                accessibilityRole="button"
                accessibilityLabel="Speak reply again">
                <Text style={styles.speakAgainText}>Repeat Again</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Green.surface, padding: 20 },

  header:         { flexDirection: 'row', alignItems: 'center', marginBottom: 40 },
  title:          { flex: 1, fontSize: 20, fontWeight: '700', color: Green.dark },
  closeBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center' },
  closeBtnText:   { fontSize: 16, color: '#555', fontWeight: '600' },

  waveArea:       { alignItems: 'center', marginBottom: 36, paddingVertical: 20 },
  barsRow:        { flexDirection: 'row', alignItems: 'center', gap: 6, height: 64, marginBottom: 20 },
  bar:            { width: 7, height: 48, borderRadius: 4 },
  spinner:        { marginBottom: 8 },
  phaseLabel:     { fontSize: 15, color: '#555', fontWeight: '500' },
  errorText:      { fontSize: 13, color: '#C62828', marginTop: 8, textAlign: 'center' },

  card:           { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  replyCard:      { backgroundColor: Green.light },
  cardLabel:      { fontSize: 11, fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  replyLabel:     { color: Green.dark },
  cardBody:       { fontSize: 15, color: '#222', lineHeight: 22 },

  speakAgainBtn:  { marginTop: 12, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Green.primary },
  speakAgainText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
