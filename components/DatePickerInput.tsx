import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, TextInput } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/Colors';
import { Shadows } from '../constants/Shadows';
import { useTheme } from '../hooks/useTheme';

interface DatePickerInputProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

const DatePickerInput = ({
  label,
  value,
  onChange,
  placeholder = 'Selecione a data',
  minimumDate,
  maximumDate
}: DatePickerInputProps) => {
  const [show, setShow] = useState(false);
  const { colors } = useTheme();

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // No Android, o picker fecha automaticamente
    if (Platform.OS === 'android') {
      setShow(false);
    }
    
    if (selectedDate && event.type === 'set') {
      onChange(selectedDate);
    }
  };

  const handleWebDateChange = (dateString: string) => {
    if (dateString) {
      const selectedDate = new Date(dateString);
      onChange(selectedDate);
    }
  };

  const toSafeDate = (d: any): Date | null => {
    if (!d) return null;
    if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
    if (typeof d === 'string') {
      // "DD/MM/YYYY"
      const parts = d.split('/');
      if (parts.length === 3) {
        const parsed = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        return isNaN(parsed.getTime()) ? null : parsed;
      }
      // "YYYY-MM-DD" or ISO
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  const formatDate = (date: Date | null): string => {
    const safe = toSafeDate(date);
    if (!safe) return placeholder;
    const day = safe.getDate().toString().padStart(2, '0');
    const month = (safe.getMonth() + 1).toString().padStart(2, '0');
    const year = safe.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDateForWeb = (date: Date | null): string => {
    const safe = toSafeDate(date);
    if (!safe) return '';
    const year = safe.getFullYear();
    const month = (safe.getMonth() + 1).toString().padStart(2, '0');
    const day = safe.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateLimitForWeb = (date?: Date): string | undefined => {
    const safe = toSafeDate(date);
    if (!safe) return undefined;
    const year = safe.getFullYear();
    const month = (safe.getMonth() + 1).toString().padStart(2, '0');
    const day = safe.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Versão Web com TextInput (type="date" via nativeID)
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        {!!label && <Text style={[styles.label, { color: colors.text.primary }]}>{label}</Text>}
        <View style={[styles.input, { backgroundColor: colors.surface }]}>
          <Ionicons name="calendar-outline" size={20} color={colors.text.secondary} style={styles.icon} />
          <TextInput
            style={[styles.dateText, { color: colors.text.primary }]}
            value={formatDateForWeb(value)}
            onChangeText={(text) => handleWebDateChange(text)}
            placeholder={placeholder}
            placeholderTextColor={colors.text.light}
            // @ts-ignore — web-only prop
            type="date"
          />
        </View>
      </View>
    );
  }

  // Versão Mobile (iOS/Android)
  return (
    <View style={styles.container}>
      {!!label && <Text style={[styles.label, { color: colors.text.primary }]}>{label}</Text>}
      <TouchableOpacity
        style={[styles.input, { backgroundColor: colors.surface }]}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.text.secondary} style={styles.icon} />
        <Text style={[styles.dateText, { color: value ? colors.text.primary : colors.text.light }]}>
          {formatDate(value)}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.text.secondary} />
      </TouchableOpacity>

      {show && (
        <>
          {Platform.OS === 'ios' && (
            <View style={[styles.iosPickerContainer, { backgroundColor: colors.surface }]}>
              <View style={[styles.iosPickerHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={[styles.iosPickerButton, { color: Theme.primary }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={[styles.iosPickerButton, styles.iosPickerDone, { color: Theme.primary }]}>Confirmar</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={toSafeDate(value) || new Date()}
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                locale="pt-BR"
              />
            </View>
          )}
          {Platform.OS === 'android' && (
            <DateTimePicker
              value={toSafeDate(value) || new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    ...Shadows.small,
  },
  icon: {
    marginRight: 10,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
  },
  iosPickerContainer: {
    borderRadius: 12,
    marginTop: 10,
    overflow: 'hidden',
    ...Shadows.medium,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iosPickerButton: {
    fontSize: 16,
  },
  iosPickerDone: {
    fontWeight: 'bold',
  },
});

export default DatePickerInput;
