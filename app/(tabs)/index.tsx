import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { Green } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function TasksScreen() {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.greeting}>Hello, {user?.first_name}!</Text>
        <Text style={styles.roleTag}>
          {user?.role === 'janitor' ? 'Janitor' : 'Supervisor'}
        </Text>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Tasks will appear here.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:            { flex: 1, backgroundColor: Green.surface },
  container:       { flex: 1, padding: 24 },
  greeting:        { fontSize: 26, fontWeight: '700', color: Green.primary, marginBottom: 6 },
  roleTag:         {
    fontSize: 14,
    color: Green.dark,
    fontWeight: '600',
    backgroundColor: Green.light,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 24,
  },
  placeholder:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#aaa', fontSize: 16 },
});
