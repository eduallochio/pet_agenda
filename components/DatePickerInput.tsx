import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, TextInput } from 'react-native';
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

  const handleWebDateChange = (dateString: string) => {
    if (dateString) {
      const selectedDate = new Date(dateString);
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

  const formatDateForWeb = (date: Date | null): string => {
    if (!date) return '';
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  const formatDateLimitForWeb = (date?: Date): string | undefined => {
    if (!date) return undefined;
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  // Versão Web com input type="date"
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        {label && <Text style={styles.label}>{label}</Text>}
        
        <View style={styles.input}>
          <Ionicons name="calendar-outline" size={20} color={Theme.text.secondary} style={styles.icon} />
          <TextInput
            style={styles.webDateInput}
            type="date"
            value={formatDateForWeb(value)}
            onChange={(e: any) => handleWebDateChange(e.target.value)}
            placeholder={placeholder}
            min={formatDateLimitForWeb(minimumDate)}
            max={formatDateLimitForWeb(maximumDate)}
          />
        </View>
      </View>
    );
  }

  // Versão Mobile (iOS/Android)
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
  webDateInput: {
    flex: 1,
    fontSize: 16,
    color: Theme.text.primary,
    outline: 'none',
    border: 'none',
    backgroundColor: 'transparent',
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
