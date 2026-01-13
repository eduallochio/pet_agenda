import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/Colors';
import { Shadows } from '../constants/Shadows';

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

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // No Android, o picker fecha automaticamente
    if (Platform.OS === 'android') {
      setShow(false);
    }
    
    if (selectedDate && event.type === 'set') {
      onChange(selectedDate);
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return placeholder;
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity 
        style={styles.input} 
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Ionicons name="calendar-outline" size={20} color={Theme.text.secondary} style={styles.icon} />
        <Text style={[styles.dateText, !value && styles.placeholderText]}>
          {formatDate(value)}
        </Text>
        <Ionicons name="chevron-down" size={20} color={Theme.text.secondary} />
      </TouchableOpacity>

      {show && (
        <>
          {Platform.OS === 'ios' && (
            <View style={styles.iosPickerContainer}>
              <View style={styles.iosPickerHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.iosPickerButton}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={[styles.iosPickerButton, styles.iosPickerDone]}>Confirmar</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={value || new Date()}
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
              value={value || new Date()}
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
    color: Theme.text.primary,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.card,
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
    color: Theme.text.primary,
  },
  placeholderText: {
    color: Theme.text.light,
  },
  // iOS Picker Styles
  iosPickerContainer: {
    backgroundColor: '#fff',
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
    borderBottomColor: Theme.border,
  },
  iosPickerButton: {
    fontSize: 16,
    color: Theme.primary,
  },
  iosPickerDone: {
    fontWeight: 'bold',
  },
});

export default DatePickerInput;
