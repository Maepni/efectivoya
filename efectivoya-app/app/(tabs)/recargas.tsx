import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
  Linking,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Card } from '../../src/components/Card';
import { OperacionCard } from '../../src/components/OperacionCard';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import RecargasService from '../../src/services/recargas.service';
import { useAuthStore } from '../../src/store/authStore';
import type { Recarga, RecargaConfig } from '../../src/types';
import { Colors } from '../../src/constants/colors';
import { Layout } from '../../src/constants/layout';

const BANCOS = ['BCP', 'Interbank', 'Scotiabank', 'BBVA'] as const;

function NativeVideoPlayer({ url }: { url: string }) {
  const player = useVideoPlayer(url);
  return (
    <VideoView
      player={player}
      style={{ width: '100%', height: 200, borderRadius: 8 }}
      contentFit="contain"
      nativeControls
    />
  );
}

export default function RecargasScreen() {
  const insets = useSafeAreaInsets();
  const { refreshUser } = useAuthStore();
  const [recargas, setRecargas] = useState<Recarga[]>([]);
  const [config, setConfig] = useState<RecargaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [videoExpanded, setVideoExpanded] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{
    titulo: string;
    banco: string;
    video_url: string | null;
  } | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  const [bancoOrigen, setBancoOrigen] = useState('');
  const [montoDepositado, setMontoDepositado] = useState('');
  const [boucherUri, setBoucherUri] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [historialRes, configRes] = await Promise.all([
        RecargasService.getHistorial({ page: 1, limit: 50 }),
        RecargasService.getConfig(),
      ]);

      if (historialRes.success && historialRes.data) {
        setRecargas(historialRes.data.recargas || []);
      }
      if (configRes.success && configRes.data) {
        setConfig(configRes.data);
      }
    } catch (error) {
      if (__DEV__) console.error('Error al cargar recargas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permisos necesarios',
        'Necesitamos acceso a la camara para tomar una foto del comprobante'
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setBoucherUri(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    if (Platform.OS === 'android') {
      // Android: usar DocumentPicker (abre el administrador de archivos nativo)
      // que muestra TODOS los archivos/fotos sin las limitaciones del Android Photo Picker
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'image/*',
          copyToCacheDirectory: true,
        });
        if (!result.canceled && result.assets[0]) {
          setBoucherUri(result.assets[0].uri);
        }
      } catch (_err) {
        Alert.alert('Error', 'No se pudo abrir el selector de archivos');
      }
      return;
    }
    // iOS: usar ImagePicker con manejo de acceso limitado
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert(
        'Permisos necesarios',
        'Necesitamos acceso a tu galería para seleccionar el comprobante.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Configuración', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }
    if ((permission as any).accessPrivileges === 'limited') {
      Alert.alert(
        'Acceso limitado a fotos',
        'Solo tienes acceso a fotos seleccionadas. Para ver todas, ve a Configuración > EfectivoYa > Fotos y elige "Todas las fotos".',
        [
          { text: 'Continuar así', onPress: () => launchGalleryIOS() },
          { text: 'Configuración', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }
    launchGalleryIOS();
  };

  const launchGalleryIOS = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setBoucherUri(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Seleccionar Comprobante',
      'Elige una opción',
      [
        { text: 'Tomar Foto', onPress: takePhoto },
        { text: 'Elegir de Galería', onPress: pickFromGallery },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const toggleVideoTutorial = async (banco: string) => {
    if (videoExpanded && selectedVideo?.banco === banco) {
      setVideoExpanded(false);
      return;
    }
    setVideoLoading(true);
    try {
      const response = await RecargasService.getVideoInstructivo(banco);
      if (response.success && response.data) {
        setSelectedVideo(response.data.video);
        setVideoExpanded(true);
      }
    } catch (_error) {
      Alert.alert('Error', 'No se pudo cargar el video instructivo');
    } finally {
      setVideoLoading(false);
    }
  };

  const comisionPct = config && bancoOrigen
    ? config.comisiones[bancoOrigen as keyof typeof config.comisiones] ?? 0
    : 0;

  const calcularComision = () => {
    const monto = parseFloat(montoDepositado);
    if (!montoDepositado || isNaN(monto) || !config || !bancoOrigen) return 0;
    return (monto * comisionPct) / 100;
  };

  const calcularMontoNeto = () => {
    const monto = parseFloat(montoDepositado);
    if (!montoDepositado || isNaN(monto)) return 0;
    return monto - calcularComision();
  };

  const handleSubmit = async () => {
    if (!bancoOrigen) {
      Alert.alert('Error', 'Selecciona el banco de origen');
      return;
    }
    if (!montoDepositado) {
      Alert.alert('Error', 'Ingresa el monto depositado');
      return;
    }
    const monto = parseFloat(montoDepositado);
    if (isNaN(monto) || monto <= 0) {
      Alert.alert('Error', 'Monto invalido');
      return;
    }
    if (config) {
      const minimo = config.limites.minimo;
      const maximo = config.limites.maximo;
      if (monto < minimo) {
        Alert.alert('Error', `El monto minimo es S/. ${minimo.toFixed(2)}`);
        return;
      }
      if (monto > maximo) {
        Alert.alert('Error', `El monto maximo es S/. ${maximo.toFixed(2)}`);
        return;
      }
    }
    if (!boucherUri) {
      Alert.alert('Error', 'Sube el comprobante de deposito');
      return;
    }

    setSubmitting(true);
    try {
      const filename = boucherUri.split('/').pop() || 'voucher.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      const response = await RecargasService.solicitarRecarga({
        banco_origen: bancoOrigen,
        monto_depositado: monto,
        boucher: { uri: boucherUri, name: filename, type },
      });

      if (response.success) {
        setModalVisible(false);
        resetForm();
        loadData();
        refreshUser();
        Alert.alert(
          'Solicitud Enviada!',
          'Tu recarga esta siendo revisada. Te notificaremos cuando sea aprobada.'
        );
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Error al enviar solicitud'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setBancoOrigen('');
    setMontoDepositado('');
    setBoucherUri('');
  };

  const handleVerComprobante = (recarga: Recarga) => {
    if (recarga.estado !== 'aprobado') {
      Alert.alert('Info', 'El comprobante estara disponible cuando se apruebe la recarga');
      return;
    }
    if (!recarga.comprobante_pdf_url) {
      Alert.alert('Info', 'El comprobante aún está siendo generado. Intenta de nuevo en un momento.');
      return;
    }
    Linking.openURL(recarga.comprobante_pdf_url);
  };

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Recargas</Text>
        </View>

        <TouchableOpacity
          style={styles.mainActionButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle-outline" size={24} color={Colors.white} />
          <Text style={styles.mainActionButtonText}>Nueva Recarga</Text>
        </TouchableOpacity>

        {config && (
          <Card style={styles.infoCard}>
            <Text style={styles.infoTitle}>Informacion de Recargas</Text>
            <Text style={[styles.infoLabel, { marginBottom: 4 }]}>Comisiones por banco:</Text>
            {BANCOS.map((banco) => (
              <View key={banco} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{banco}:</Text>
                <Text style={styles.infoValue}>{config.comisiones[banco]}%</Text>
              </View>
            ))}
            <View style={[styles.infoRow, { marginTop: 8 }]}>
              <Text style={styles.infoLabel}>Monto minimo:</Text>
              <Text style={styles.infoValue}>
                {config.limites.minimoFormateado}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Monto maximo:</Text>
              <Text style={styles.infoValue}>
                {config.limites.maximoFormateado}
              </Text>
            </View>
          </Card>
        )}

        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>Historial</Text>
          {recargas.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="document-text-outline"
                size={64}
                color={Colors.gray}
              />
              <Text style={styles.emptyText}>No tienes recargas aun</Text>
              <Text style={styles.emptySubtext}>
                Presiona el boton + para hacer tu primera recarga
              </Text>
            </View>
          ) : (
            recargas.map((recarga) => (
              <OperacionCard
                key={recarga.id}
                tipo="recarga"
                numero_operacion={recarga.numero_operacion}
                monto={Number(recarga.monto_neto)}
                estado={recarga.estado}
                fecha={recarga.created_at}
                banco={recarga.banco_origen}
                motivo_rechazo={recarga.motivo_rechazo}
                onPress={() => handleVerComprobante(recarga)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal Nueva Recarga */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nueva Recarga</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color={Colors.accent} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: insets.bottom }}>
            <Text style={styles.label}>Banco de Origen *</Text>
            <View style={styles.bancosGrid}>
              {BANCOS.map((banco) => (
                <TouchableOpacity
                  key={banco}
                  style={[
                    styles.bancoOption,
                    bancoOrigen === banco && styles.bancoSelected,
                  ]}
                  onPress={() => {
                    setBancoOrigen(banco);
                    if (banco !== bancoOrigen) {
                      setVideoExpanded(false);
                      setSelectedVideo(null);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.bancoText,
                      bancoOrigen === banco && styles.bancoTextSelected,
                    ]}
                  >
                    {banco}
                  </Text>
                  {bancoOrigen === banco && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={Colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {bancoOrigen !== '' && (
              <View style={styles.videoSection}>
                <TouchableOpacity
                  style={styles.videoButton}
                  onPress={() => toggleVideoTutorial(bancoOrigen)}
                  disabled={videoLoading}
                >
                  {videoLoading ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <Ionicons
                      name={videoExpanded ? 'chevron-up-circle' : 'play-circle'}
                      size={20}
                      color={Colors.primary}
                    />
                  )}
                  <Text style={styles.videoButtonText}>
                    {videoExpanded ? 'Ocultar tutorial' : `Ver tutorial de deposito en ${bancoOrigen}`}
                  </Text>
                </TouchableOpacity>

                {videoExpanded && selectedVideo && (
                  <View style={styles.videoPlayerContainer}>
                    <Text style={styles.videoTitle}>{selectedVideo.titulo}</Text>
                    {selectedVideo.video_url ? (
                      Platform.OS === 'web' ? (
                        <video
                          src={selectedVideo.video_url}
                          controls
                          style={{
                            width: '100%',
                            height: 200,
                            borderRadius: 8,
                            backgroundColor: '#000',
                          }}
                        />
                      ) : (
                        <NativeVideoPlayer url={selectedVideo.video_url} />
                      )
                    ) : (
                      <View style={styles.videoFallback}>
                        <Ionicons name="videocam-off" size={48} color={Colors.gray} />
                        <Text style={styles.videoFallbackText}>
                          Video no disponible
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            <Input
              label="Monto Depositado *"
              placeholder="1000.00"
              value={montoDepositado}
              onChangeText={setMontoDepositado}
              keyboardType="decimal-pad"
              icon="cash"
            />

            {bancoOrigen !== '' &&
              montoDepositado !== '' &&
              !isNaN(parseFloat(montoDepositado)) && (
                <Card style={styles.calculoCard}>
                  <View style={styles.calculoRow}>
                    <Text style={styles.calculoLabel}>Monto depositado:</Text>
                    <Text style={styles.calculoValue}>
                      S/. {parseFloat(montoDepositado).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.calculoRow}>
                    <Text style={styles.calculoLabel}>
                      Comision ({comisionPct}%):
                    </Text>
                    <Text
                      style={[styles.calculoValue, { color: Colors.error }]}
                    >
                      -S/. {calcularComision().toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.calculoRow, styles.calculoTotal]}>
                    <Text style={styles.calculoTotalLabel}>Recibiras:</Text>
                    <Text style={styles.calculoTotalValue}>
                      S/. {calcularMontoNeto().toFixed(2)}
                    </Text>
                  </View>
                </Card>
              )}

            <Text style={styles.label}>Comprobante de Deposito *</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={showImageOptions}
            >
              {boucherUri ? (
                <View style={styles.imagePreview}>
                  <Image
                    key={boucherUri}
                    source={{ uri: boucherUri }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setBoucherUri('')}
                  >
                    <Ionicons
                      name="close-circle"
                      size={24}
                      color={Colors.error}
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadPlaceholder}>
                  <Ionicons name="cloud-upload" size={48} color={Colors.gray} />
                  <Text style={styles.uploadText}>Subir Comprobante</Text>
                  <Text style={styles.uploadSubtext}>
                    Toca para tomar foto o elegir de galeria
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <Button
              title="Enviar Solicitud"
              onPress={handleSubmit}
              loading={submitting}
              style={styles.submitButton}
            />
          </ScrollView>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Layout.spacing.lg,
  },
  title: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  mainActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Layout.borderRadius.lg,
    paddingVertical: Layout.spacing.lg,
    marginHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
    gap: Layout.spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  mainActionButtonText: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.white,
  },
  infoCard: {
    marginHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
    backgroundColor: Colors.primaryLight,
  },
  infoTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: 'bold',
    color: Colors.accent,
    marginBottom: Layout.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Layout.spacing.xs,
  },
  infoLabel: { fontSize: Layout.fontSize.sm, color: Colors.text },
  infoValue: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  listContainer: { padding: Layout.spacing.lg },
  sectionTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.accent,
    marginBottom: Layout.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.xl * 2,
  },
  emptyText: {
    fontSize: Layout.fontSize.md,
    color: Colors.gray,
    marginTop: Layout.spacing.md,
  },
  emptySubtext: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    marginTop: Layout.spacing.xs,
    textAlign: 'center',
  },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Layout.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  modalContent: { flex: 1, padding: Layout.spacing.lg },
  label: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.sm,
  },
  bancosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  bancoOption: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.lightGray,
  },
  bancoSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  bancoText: {
    fontSize: Layout.fontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  bancoTextSelected: { color: Colors.primary, fontWeight: 'bold' },
  videoSection: {
    marginBottom: Layout.spacing.md,
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.sm,
    gap: Layout.spacing.xs,
  },
  videoButtonText: {
    color: Colors.primary,
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
  videoPlayerContainer: {
    marginTop: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
    backgroundColor: Colors.lightGray,
    padding: Layout.spacing.sm,
  },
  videoPlayer: {
    width: '100%',
    height: 200,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: '#000',
  },
  videoFallback: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
    borderRadius: Layout.borderRadius.md,
  },
  videoFallbackText: {
    color: Colors.gray,
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    marginTop: Layout.spacing.sm,
  },
  calculoCard: {
    backgroundColor: Colors.lightGray,
    marginBottom: Layout.spacing.md,
  },
  calculoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Layout.spacing.xs,
  },
  calculoLabel: { fontSize: Layout.fontSize.sm, color: Colors.text },
  calculoValue: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.text,
  },
  calculoTotal: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Layout.spacing.xs,
    paddingTop: Layout.spacing.sm,
  },
  calculoTotalLabel: {
    fontSize: Layout.fontSize.md,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  calculoTotalValue: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  uploadButton: { marginBottom: Layout.spacing.md },
  imagePreview: {
    alignItems: 'center',
    borderRadius: Layout.borderRadius.md,
  },
  previewImage: {
    width: Dimensions.get('window').width - 80,
    height: 300,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.lightGray,
  },
  removeImageButton: {
    position: 'absolute',
    top: Layout.spacing.sm,
    right: Layout.spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.full,
  },
  uploadPlaceholder: {
    height: 200,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  uploadText: {
    fontSize: Layout.fontSize.md,
    color: Colors.gray,
    marginTop: Layout.spacing.sm,
    fontWeight: '600',
  },
  uploadSubtext: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
    marginTop: Layout.spacing.xs,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: Layout.spacing.md,
    marginBottom: Layout.spacing.xl,
  },
  videoTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: Layout.spacing.sm,
  },
});
