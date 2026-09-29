import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/constants/colors';
export function RemoteImage({ uri, height = 190 }: { uri: string | null | undefined; height?: number }) { if (!uri) return <View style={[styles.placeholder, { height }]} />; return <Image source={{ uri }} style={[styles.image, { height }]} contentFit="cover" transition={180} />; }
const styles = StyleSheet.create({ image: { width: '100%', borderRadius: 14, backgroundColor: colors.orangeSoft }, placeholder: { width: '100%', borderRadius: 14, backgroundColor: colors.orangeSoft } });
