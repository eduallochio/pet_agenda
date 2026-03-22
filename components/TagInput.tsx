import React, { useState } from 'react';
import {
	View, Text, TextInput, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/Colors';

type Props = {
	label: string;
	tags: string[];
	onChange: (tags: string[]) => void;
	placeholder?: string;
	color?: string;
};

export default function TagInput({ label, tags, onChange, placeholder, color }: Props) {
	const { colors } = useTheme();
	const accentColor = color ?? Theme.primary;
	const [inputValue, setInputValue] = useState('');

	const addTag = () => {
		const val = inputValue.trim();
		if (!val || tags.includes(val)) { setInputValue(''); return; }
		onChange([...tags, val]);
		setInputValue('');
	};

	const removeTag = (tag: string) => {
		onChange(tags.filter(t => t !== tag));
	};

	return (
		<View style={styles.container}>
			<Text style={[styles.label, { color: colors.text.primary }]}>{label}</Text>
			<View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
				<TextInput
					style={[styles.input, { color: colors.text.primary }]}
					value={inputValue}
					onChangeText={setInputValue}
					placeholder={placeholder ?? 'Adicionar...'}
					placeholderTextColor={colors.text.light}
					onSubmitEditing={addTag}
					returnKeyType="done"
				/>
				<TouchableOpacity
					style={[styles.addBtn, { backgroundColor: accentColor }]}
					onPress={addTag}
				>
					<Ionicons name="add" size={18} color="#fff" />
				</TouchableOpacity>
			</View>
			{tags.length > 0 && (
				<View style={styles.tagsRow}>
					{tags.map(tag => (
						<View
							key={tag}
							style={[styles.tag, { backgroundColor: accentColor + '20', borderColor: accentColor + '50' }]}
						>
							<Text style={[styles.tagText, { color: accentColor }]}>{tag}</Text>
							<TouchableOpacity onPress={() => removeTag(tag)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
								<Ionicons name="close" size={13} color={accentColor} />
							</TouchableOpacity>
						</View>
					))}
				</View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { marginBottom: 20 },
	label: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
	inputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1.5,
		borderRadius: 12,
		paddingLeft: 12,
		overflow: 'hidden',
	},
	input: { flex: 1, fontSize: 15, paddingVertical: 12 },
	addBtn: {
		width: 44,
		height: 44,
		justifyContent: 'center',
		alignItems: 'center',
	},
	tagsRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginTop: 10,
		gap: 8,
	},
	tag: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 20,
		borderWidth: 1,
	},
	tagText: { fontSize: 13, fontWeight: '600' },
});
