import React, { useCallback, useMemo, forwardRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import BottomSheet, {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useTheme } from '../hooks/useTheme';

// ─── Sheet simples (não modal) ───────────────────────────────────────────────
interface AppBottomSheetProps {
  snapPoints?: (string | number)[];
  title?: string;
  children: React.ReactNode;
  onChange?: (index: number) => void;
}

export const AppBottomSheet = forwardRef<BottomSheet, AppBottomSheetProps>(
  ({ snapPoints = ['40%', '75%'], title, children, onChange }, ref) => {
    const { colors, isDarkMode } = useTheme();

    const bgStyle = useMemo(() => ({
      backgroundColor: colors.surface,
    }), [colors.surface]);

    const handleStyle = useMemo(() => ({
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    }), [colors.surface]);

    const handleIndicatorStyle = useMemo(() => ({
      backgroundColor: colors.border,
      width: 40,
    }), [colors.border]);

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={bgStyle}
        handleStyle={handleStyle}
        handleIndicatorStyle={handleIndicatorStyle}
        onChange={onChange}
      >
        <BottomSheetView style={styles.container}>
          {title && (
            <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
          )}
          {children}
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

// ─── Sheet Modal (aparece sobre tudo, com backdrop) ──────────────────────────
interface AppBottomSheetModalProps {
  snapPoints?: (string | number)[];
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  scrollable?: boolean;
}

export const AppBottomSheetModal = forwardRef<BottomSheetModal, AppBottomSheetModalProps>(
  ({ snapPoints = ['50%', '85%'], title, children, onDismiss, scrollable = false }, ref) => {
    const { colors } = useTheme();

    const bgStyle = useMemo(() => ({
      backgroundColor: colors.surface,
    }), [colors.surface]);

    const handleStyle = useMemo(() => ({
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    }), [colors.surface]);

    const handleIndicatorStyle = useMemo(() => ({
      backgroundColor: colors.border,
      width: 40,
    }), [colors.border]);

    const renderBackdrop = useCallback((props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ), []);

    const Content = scrollable ? BottomSheetScrollView : BottomSheetView;

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={bgStyle}
        handleStyle={handleStyle}
        handleIndicatorStyle={handleIndicatorStyle}
        backdropComponent={renderBackdrop}
        onDismiss={onDismiss}
      >
        <Content style={styles.container} contentContainerStyle={scrollable ? styles.scrollContent : undefined}>
          {title && (
            <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
          )}
          {children}
        </Content>
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  scrollContent: {
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 16,
    marginTop: 4,
  },
});
