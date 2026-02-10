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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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

export default function RecargasScreen() {
  const { refreshUser } = useAuthStore();
  const [recargas, setRecargas] = useState<Recarga[]>([]);
  const [config, setConfig] = useState<RecargaConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{
    titulo: string;
    banco: string;
    youtube_url: string;
  } | null>(null);

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
        setConfig(configRes.data.config);
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

  const pickImage = async () => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permisos necesarios',
        'Necesitamos acceso a tu galería para subir el comprobante'
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setBoucherUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permisos necesarios',
        'Necesitamos acceso a la cámara para tomar una foto del comprobante'
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setBoucherUri(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Seleccionar Comprobante', 'Elige una opción', [
      { text: 'Tomar Foto', onPress: takePhoto },
      { text: 'Elegir de Galería', onPress: pickImage },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const showVideoTutorial = async (banco: string) => {
    try {
      const response = await RecargasService.getVideoInstructivo(banco);
      if (response.success && response.data) {
        setSelectedVideo(response.data.video);
        setVideoModalVisible(true);
      }
    } catch (_error) {
      Alert.alert('Error', 'No se pudo cargar el video instructivo');
    }
  };

  const comisionPct = config ? Number(config.porcentaje_comision) : 0;

  const calcularComision = () => {
    const monto = parseFloat(montoDepositado);
    if (!montoDepositado || isNaN(monto) || !config) return 0;
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
      Alert.alert('Error', 'Monto inválido');
      return;
    }
    if (config) {
      const minimo = Number(config.monto_minimo_recarga);
      const maximo = Number(config.monto_maximo_recarga);
      if (monto < minimo) {
        Alert.alert('Error', `El monto mínimo es S/. ${minimo.toFixed(2)}`);
        return;
      }
      if (monto > maximo) {
        Alert.alert('Error', `El monto máximo es S/. ${maximo.toFixed(2)}`);
        return;
      }
    }
    if (!boucherUri) {
      Alert.alert('Error', 'Sube el comprobante de depósito');
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
        Alert.alert(
          '¡Solicitud Enviada!',
          'Tu recarga está siendo revisada. Te notificaremos cuando sea aprobada.',
          [
            {
              text: 'OK',
              onPress: () => {
                setModalVisible(false);
                resetForm();
                loadData();
                refreshUser();
              },
            },
          ]
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

  const handleVerComprobante = async (recarga: Recarga) => {
    if (recarga.estado !== 'aprobado' || !recarga.comprobante_pdf_url) {
      Alert.alert(
        'Info',
        'El comprobante estará disponible cuando se apruebe la recarga'
      );
      return;
    }
    try {
      const response = await RecargasService.getComprobante(recarga.id);
      if (response.success && response.data?.comprobante_url) {
        Linking.openURL(response.data.comprobante_url);
      }
    } catch (_error) {
      Alert.alert('Error', 'No se pudo descargar el comprobante');
    }
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
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add-circle" size={32} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {config && (
          <Card style={styles.infoCard}>
            <Text style={styles.infoTitle}>Información de Recargas</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Comisión:</Text>
              <Text style={styles.infoValue}>{comisionPct}%</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Monto mínimo:</Text>
              <Text style={styles.infoValue}>
                S/. {Number(config.monto_minimo_recarga).toFixed(2)}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Monto máximo:</Text>
              <Text style={styles.infoValue}>
                S/. {Number(config.monto_maximo_recarga).toFixed(2)}
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
              <Text style={styles.emptyText}>No tienes recargas aún</Text>
              <Text style={styles.emptySubtext}>
                Presiona el botón + para hacer tu primera recarga
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

          <ScrollView style={styles.modalContent}>
            {config?.cuenta_recaudadora_numero && (
              <Card style={styles.cuentaCard}>
                <View style={styles.cuentaHeader}>
                  <Ionicons name="business" size={24} color={Colors.primary} />
                  <Text style={styles.cuentaTitle}>
                    Deposita a esta cuenta:
                  </Text>
                </View>
                <Text style={styles.cuentaBanco}>
                  {config.cuenta_recaudadora_banco}
                </Text>
                <Text style={styles.cuentaNumero}>
                  {config.cuenta_recaudadora_numero}
                </Text>
                <Text style={styles.cuentaTitular}>
                  {config.cuenta_recaudadora_titular}
                </Text>
              </Card>
            )}

            <Text style={styles.label}>Banco de Origen *</Text>
            <View style={styles.bancosGrid}>
              {BANCOS.map((banco) => (
                <TouchableOpacity
                  key={banco}
                  style={[
                    styles.bancoOption,
                    bancoOrigen === banco && styles.bancoSelected,
                  ]}
                  onPress={() => setBancoOrigen(banco)}
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
              <TouchableOpacity
                style={styles.videoButton}
                onPress={() => showVideoTutorial(bancoOrigen)}
              >
                <Ionicons
                  name="play-circle"
                  size={20}
                  color={Colors.primary}
                />
                <Text style={styles.videoButtonText}>
                  Ver tutorial de depósito en {bancoOrigen}
                </Text>
              </TouchableOpacity>
            )}

            <Input
              label="Monto Depositado *"
              placeholder="1000.00"
              value={montoDepositado}
              onChangeText={setMontoDepositado}
              keyboardType="decimal-pad"
              icon="cash"
            />

            {montoDepositado !== '' &&
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
                      Comisión ({comisionPct}%):
                    </Text>
                    <Text
                      style={[styles.calculoValue, { color: Colors.error }]}
                    >
                      -S/. {calcularComision().toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.calculoRow, styles.calculoTotal]}>
                    <Text style={styles.calculoTotalLabel}>Recibirás:</Text>
                    <Text style={styles.calculoTotalValue}>
                      S/. {calcularMontoNeto().toFixed(2)}
                    </Text>
                  </View>
                </Card>
              )}

            <Text style={styles.label}>Comprobante de Depósito *</Text>
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={showImageOptions}
            >
              {boucherUri ? (
                <View style={styles.imagePreview}>
                  <Image
                    source={{ uri: boucherUri }}
                    style={styles.previewImage}
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
                    Toca para tomar foto o elegir de galería
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

      {/* Modal Video Tutorial */}
      <Modal
        visible={videoModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tutorial de Depósito</Text>
            <TouchableOpacity onPress={() => setVideoModalVisible(false)}>
              <Ionicons name="close" size={28} color={Colors.accent} />
            </TouchableOpacity>
          </View>
          <View style={styles.videoContent}>
            {selectedVideo && (
              <>
                <Text style={styles.videoTitle}>{selectedVideo.titulo}</Text>
                <Text style={styles.videoBanco}>
                  Banco: {selectedVideo.banco}
                </Text>
                <Button
                  title="Ver Video en YouTube"
                  onPress={() => {
                    if (selectedVideo.youtube_url)
                      Linking.openURL(selectedVideo.youtube_url);
                  }}
                  style={styles.youtubeButton}
                />
              </>
            )}
          </View>
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
  addButton: { padding: Layout.spacing.xs },
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
  cuentaCard: {
    backgroundColor: Colors.secondary + '10',
    marginBottom: Layout.spacing.lg,
  },
  cuentaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  cuentaTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.accent,
    marginLeft: Layout.spacing.sm,
  },
  cuentaBanco: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.secondary,
    marginBottom: Layout.spacing.xs,
  },
  cuentaNumero: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.accent,
    marginBottom: Layout.spacing.xs,
  },
  cuentaTitular: { fontSize: Layout.fontSize.sm, color: Colors.gray },
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
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
    gap: Layout.spacing.xs,
  },
  videoButtonText: {
    color: Colors.primary,
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
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
    position: 'relative',
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
  },
  previewImage: { width: '100%', height: 200, resizeMode: 'cover' },
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
  videoContent: { padding: Layout.spacing.lg },
  videoTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.accent,
    marginBottom: Layout.spacing.sm,
  },
  videoBanco: {
    fontSize: Layout.fontSize.md,
    color: Colors.gray,
    marginBottom: Layout.spacing.lg,
  },
  youtubeButton: { backgroundColor: '#FF0000' },
});
