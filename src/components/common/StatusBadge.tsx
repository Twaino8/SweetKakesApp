import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { statusColor, capitalise } from '../../utils/formatters';

interface Props {
  status: string;
  small?: boolean;
}

export default function StatusBadge({ status, small }: Props) {
  const color = statusColor(status);
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '66' }, small && styles.small]}>
      <Text style={[styles.text, { color }, small && styles.smallText]}>{capitalise(status)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  small: { paddingHorizontal: 7, paddingVertical: 2 },
  text: { fontSize: 12, fontWeight: '600' },
  smallText: { fontSize: 10 },
});
