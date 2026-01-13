import { useState, useCallback } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface FieldConfig {
  [fieldName: string]: ValidationRule;
}

export interface FieldErrors {
  [fieldName: string]: string;
}

export interface TouchedFields {
  [fieldName: string]: boolean;
}

export function useFormValidation(config: FieldConfig) {
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<TouchedFields>({});

  const validateField = useCallback((fieldName: string, value: any): string => {
    const rules = config[fieldName];
    if (!rules) return '';

    // Required
    if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      return 'Este campo é obrigatório';
    }

    // Se o campo não é obrigatório e está vazio, não valida outras regras
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return '';
    }

    // Min length
    if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
      return `Mínimo de ${rules.minLength} caracteres`;
    }

    // Max length
    if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
      return `Máximo de ${rules.maxLength} caracteres`;
    }

    // Pattern
    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      return 'Formato inválido';
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) return customError;
    }

    return '';
  }, [config]);

  const validate = useCallback((fieldName: string, value: any): boolean => {
    const error = validateField(fieldName, value);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
    return error === '';
  }, [validateField]);

  const validateAll = useCallback((values: { [key: string]: any }): boolean => {
    const newErrors: FieldErrors = {};
    let isValid = true;

    Object.keys(config).forEach(fieldName => {
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched(Object.keys(config).reduce((acc, key) => ({ ...acc, [key]: true }), {}));
    return isValid;
  }, [config, validateField]);

  const touchField = useCallback((fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  }, []);

  const clearError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const getFieldError = useCallback((fieldName: string): string => {
    return touched[fieldName] ? errors[fieldName] || '' : '';
  }, [errors, touched]);

  const hasError = useCallback((fieldName: string): boolean => {
    return touched[fieldName] && !!errors[fieldName];
  }, [errors, touched]);

  return {
    errors,
    touched,
    validate,
    validateAll,
    touchField,
    clearError,
    clearAllErrors,
    getFieldError,
    hasError,
  };
}
