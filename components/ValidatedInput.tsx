import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import IconInput from './IconInput';
import { Theme } from '../constants/Colors';

interface ValidatedInputProps {
  iconName: any;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
}

export default function ValidatedInput({
  iconName,
  placeholder,
  value,
  onChangeText,
  onBlur,
  error,
  required = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  secureTextEntry = false,
  multiline = false,
  numberOfLines = 1,
}: ValidatedInputProps) {
  const [shakeAnimation] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (error) {
      // Animação de shake quando há erro
      Animated.sequence([
        Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [error, shakeAnimation]);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: shakeAnimation }] }]}>
      <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
        <IconInput
          iconName={iconName}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          numberOfLines={numberOfLines}
        />
        {required && !value && (
          <View style={styles.requiredBadge}>
            <Text style={styles.requiredText}>*</Text>
          </View>
        )}
      </View>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputWrapper: {
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: 12,
  },
  inputWrapperError: {
    borderColor: '#DC3545',
  },
  requiredBadge: {
    position: 'absolute',
    top: -8,
    right: 12,
    backgroundColor: Theme.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requiredText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    marginTop: 4,
    marginLeft: 4,
  },
  errorText: {
    color: '#DC3545',
    fontSize: 12,
    fontWeight: '500',
  },
});
