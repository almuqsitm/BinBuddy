import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { Green } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function SettingsScreen() {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.row}>
          <Text style={styles.key}>Name</Text>
          <Text style={styles.value}>{user?.first_name} {user?.last_name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.key}>Email</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.key}>Role</Text>
          <Text style={styles.value}>
            {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '—'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.key}>Member since</Text>
          <Text style={styles.value}>
            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: Green.surface },
  container: { flex: 1, padding: 24 },
  title:     { fontSize: 26, fontWeight: '700', color: Green.primary, marginBottom: 20 },
  row:       {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  key:       { fontSize: 15, color: '#555', fontWeight: '600' },
  value:     { fontSize: 15, color: '#333', flexShrink: 1, textAlign: 'right' },
});
