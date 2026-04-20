import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { lookupUser, createUser } from '@/lib/api';
import { Green } from '@/constants/theme';

type Role = 'janitor' | 'supervisor';
type ScreenState = 'idle' | 'loading' | 'new_user' | 'error';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail]         = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [role, setRole]           = useState<Role>('janitor');
  const [state, setState]         = useState<ScreenState>('idle');
  const [errorMsg, setErrorMsg]   = useState('');

  const isNewUser = state === 'new_user';

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (state !== 'idle') setState('idle');
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      setState('error');
      return;
    }

    if (isNewUser) {
      if (!firstName.trim() || !lastName.trim()) {
        setErrorMsg('Please enter your first and last name.');
        setState('error');
        return;
      }
      setState('loading');
      setErrorMsg('');
      try {
        const created = await createUser({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          role,
        });
        await login(created);
        router.replace('/(tabs)');
      } catch (err: any) {
        setErrorMsg(err.message ?? 'Something went wrong. Please try again.');
        setState('error');
      }
      return;
    }

    setState('loading');
    setErrorMsg('');
    try {
      const existing = await lookupUser(email.trim());
      if (existing) {
        await login(existing);
        router.replace('/(tabs)');
      } else {
        setState('new_user');
      }
    } catch (err: any) {
      setErrorMsg(err.message ?? 'Something went wrong. Please try again.');
      setState('error');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled">

          <View style={styles.header}>
            <Text style={styles.appName}>BinBuddy</Text>
            <Text style={styles.tagline}>Waste management, simplified</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {isNewUser ? 'Create Account' : 'Welcome'}
            </Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={handleEmailChange}
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType={isNewUser ? 'next' : 'done'}
              accessibilityLabel="Email address"
            />

            {isNewUser && (
              <>
                <View style={styles.hintBox}>
                  <Text style={styles.hintText}>
                    No account found. Fill in your details below to register.
                  </Text>
                </View>

                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="e.g. Alex"
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  accessibilityLabel="First name"
                />

                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="e.g. Rivera"
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="done"
                  accessibilityLabel="Last name"
                />

                <Text style={styles.label}>Role</Text>
                <View style={styles.roleRow}>
                  {(['janitor', 'supervisor'] as Role[]).map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                      onPress={() => setRole(r)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: role === r }}
                      accessibilityLabel={r.charAt(0).toUpperCase() + r.slice(1)}>
                      <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {(state === 'error') && (
              <Text style={styles.errorText} accessibilityRole="alert">
                {errorMsg}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, state === 'loading' && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={state === 'loading'}
              accessibilityRole="button"
              accessibilityLabel={isNewUser ? 'Create Account' : 'Continue'}>
              {state === 'loading' ? (
                <ActivityIndicator color={Green.onPrimary} />
              ) : (
                <Text style={styles.submitBtnText}>
                  {isNewUser ? 'Create Account' : 'Continue'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:          { flex: 1, backgroundColor: Green.surface },
  flex:              { flex: 1 },
  container:         { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header:            { alignItems: 'center', marginBottom: 32 },
  appName:           { fontSize: 36, fontWeight: 'bold', color: Green.primary },
  tagline:           { fontSize: 14, color: Green.dark, marginTop: 4 },
  card:              {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle:         { fontSize: 22, fontWeight: '700', color: Green.primary, marginBottom: 20 },
  label:             { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6 },
  input:             {
    borderWidth: 1.5,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    color: '#111',
  },
  hintBox:           { backgroundColor: Green.surface, borderRadius: 8, padding: 12, marginBottom: 16 },
  hintText:          { color: Green.dark, fontSize: 13 },
  roleRow:           { flexDirection: 'row', gap: 12, marginBottom: 20 },
  roleBtn:           {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Green.light,
    alignItems: 'center',
  },
  roleBtnActive:     { backgroundColor: Green.primary, borderColor: Green.primary },
  roleBtnText:       { fontSize: 15, fontWeight: '600', color: Green.primary },
  roleBtnTextActive: { color: Green.onPrimary },
  errorText:         { color: '#C62828', fontSize: 13, marginBottom: 12 },
  submitBtn:         {
    backgroundColor: Green.primary,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText:     { color: Green.onPrimary, fontSize: 17, fontWeight: '700' },
});
