import React, { forwardRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/Colors';
import { useTranslation } from 'react-i18next';

interface ImagePickerSheetProps {
  hasPhoto: boolean;
  onCamera: () => void;
  onGallery: () => void;
  onRemove: () => void;
}

const ImagePickerSheet = forwardRef<BottomSheetModal, ImagePickerSheetProps>(
  ({ hasPhoto, onCamera, onGallery, onRemove }, ref) => {
    const { colors, isDarkMode } = useTheme();
    const { t } = useTranslation();

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      ),
      []
    );

    const dismiss = () => (ref as any)?.current?.dismiss();

    const handleCamera = () => { dismiss(); setTimeout(onCamera, 300); };
    const handleGallery = () => { dismiss(); setTimeout(onGallery, 300); };
    const handleRemove = () => { dismiss(); setTimeout(onRemove, 300); };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={[hasPhoto ? 260 : 200]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border, width: 40 }}
        handleStyle={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
      >
        <View style={styles.container}>
          <Text style={[styles.title, { color: colors.text.primary }]}>
            {t('editProfile.avatarOptions')}
          </Text>

          <TouchableOpacity
            style={[styles.option, { borderBottomColor: colors.border }]}
            onPress={handleCamera}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: Theme.primary + '20' }]}>
              <Ionicons name="camera-outline" size={22} color={Theme.primary} />
            </View>
            <Text style={[styles.optionText, { color: colors.text.primary }]}>
              {t('editProfile.camera')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text.light} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.option, { borderBottomColor: colors.border }]}
            onPress={handleGallery}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrap, { backgroundColor: Theme.primary + '20' }]}>
              <Ionicons name="image-outline" size={22} color={Theme.primary} />
            </View>
            <Text style={[styles.optionText, { color: colors.text.primary }]}>
              {t('editProfile.gallery')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.text.light} />
          </TouchableOpacity>

          {hasPhoto && (
            <TouchableOpacity
              style={[styles.option, { borderBottomColor: 'transparent' }]}
              onPress={handleRemove}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, { backgroundColor: '#EF444420' }]}>
                <MaterialCommunityIcons name="trash-can-outline" size={22} color="#EF4444" />
              </View>
              <Text style={[styles.optionText, { color: '#EF4444' }]}>
                {t('editProfile.removePhoto')}
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#EF444480" />
            </TouchableOpacity>
          )}
        </View>
      </BottomSheetModal>
    );
  }
);

export default ImagePickerSheet;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    marginTop: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
});
