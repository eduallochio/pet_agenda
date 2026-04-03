import { Link } from 'expo-router';
import type { ComponentProps } from 'react';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';

type SafeLinkProps = ComponentProps<typeof Link>;

/**
 * Wrapper para Link do expo-router que garante compatibilidade com web.
 * O Link vira <a> no DOM — arrays de estilo causam "Indexed property setter" no React DOM.
 * StyleSheet.flatten converte qualquer array/objeto para um objeto plano.
 */
export function SafeLink({ children, style, ...props }: SafeLinkProps) {
  const safeStyle = Platform.OS === 'web' && style
    ? StyleSheet.flatten(style as any) ?? undefined
    : style;

  return (
    <Link {...props} style={safeStyle as any}>
      {children}
    </Link>
  );
}

export default SafeLink;