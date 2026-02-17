import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TextInput, Switch, TouchableOpacity, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { AdminHeader } from '../../../src/components/admin/AdminHeader';
import { Colors } from '../../../src/constants/colors';
import { Layout } from '../../../src/constants/layout';
import { adminConfigService } from '../../../src/services/adminConfig.service';
import { adminVideosService, type VideoInstructivo } from '../../../src/services/adminVideos.service';
import { useResponsive } from '../../../src/hooks/useResponsive';
import type { AdminConfig } from '../../../src/types/admin';

const BANCOS = ['BCP', 'Interbank', 'Scotiabank', 'BBVA'] as const;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export default function AdminConfigScreen() {
  const { isMobile } = useResponsive();
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Videos state
  const [videos, setVideos] = useState<VideoInstructivo[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [uploadingBanco, setUploadingBanco] = useState<string | null>(null);
  const [editingTitulo, setEditingTitulo] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Form state
  const [comisionBcp, setComisionBcp] = useState('');
  const [comisionInterbank, setComisionInterbank] = useState('');
  const [comisionScotiabank, setComisionScotiabank] = useState('');
  const [comisionBbva, setComisionBbva] = useState('');
  const [montoMinRecarga, setMontoMinRecarga] = useState('');
  const [montoMaxRecarga, setMontoMaxRecarga] = useState('');
  const [bonoReferido, setBonoReferido] = useState('');
  const [maxReferidos, setMaxReferidos] = useState('');
  const [versionAndroid, setVersionAndroid] = useState('');
  const [versionIos, setVersionIos] = useState('');
  const [forzarActualizacion, setForzarActualizacion] = useState(false);
  const [mantenimientoActivo, setMantenimientoActivo] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    const res = await adminConfigService.getConfig();
    if (res.success && res.data) {
      const c = res.data.config;
      setConfig(c);
      setComisionBcp(String(c.comision_bcp));
      setComisionInterbank(String(c.comision_interbank));
      setComisionScotiabank(String(c.comision_scotiabank));
      setComisionBbva(String(c.comision_bbva));
      setMontoMinRecarga(String(c.monto_minimo_recarga));
      setMontoMaxRecarga(String(c.monto_maximo_recarga));
      setBonoReferido(String(c.bono_referido));
      setMaxReferidos(String(c.max_referidos_por_usuario));
      setVersionAndroid(c.version_minima_android);
      setVersionIos(c.version_minima_ios);
      setForzarActualizacion(c.forzar_actualizacion);
      setMantenimientoActivo(c.mantenimiento_activo);
    }
    setLoading(false);
  }, []);

  const fetchVideos = useCallback(async () => {
    setVideosLoading(true);
    try {
      const res = await adminVideosService.listVideos();
      if (res.success && res.data) {
        setVideos(res.data.videos);
        const titulos: Record<string, string> = {};
        for (const v of res.data.videos) {
          titulos[v.banco] = v.titulo;
        }
        setEditingTitulo(titulos);
      }
    } catch (_e) {
      // silenciar
    }
    setVideosLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); fetchVideos(); }, [fetchConfig, fetchVideos]);

  const handleSave = async () => {
    const doSave = async () => {
      setSaving(true);
      const res = await adminConfigService.updateConfig({
        comision_bcp: Number(comisionBcp),
        comision_interbank: Number(comisionInterbank),
        comision_scotiabank: Number(comisionScotiabank),
        comision_bbva: Number(comisionBbva),
        monto_minimo_recarga: Number(montoMinRecarga),
        monto_maximo_recarga: Number(montoMaxRecarga),
        bono_referido: Number(bonoReferido),
        max_referidos_por_usuario: Number(maxReferidos),
        version_minima_android: versionAndroid,
        version_minima_ios: versionIos,
        forzar_actualizacion: forzarActualizacion,
        mantenimiento_activo: mantenimientoActivo,
      });
      if (res.success && res.data) {
        setConfig(res.data.config);
        if (Platform.OS === 'web') {
          alert('Configuracion guardada exitosamente');
        } else {
          Alert.alert('Exito', 'Configuracion guardada exitosamente');
        }
      } else {
        if (Platform.OS === 'web') {
          alert(res.message || 'Error al guardar');
        } else {
          Alert.alert('Error', res.message || 'Error al guardar');
        }
      }
      setSaving(false);
    };

    if (Platform.OS === 'web') {
      if (confirm('Guardar los cambios de configuracion?')) doSave();
    } else {
      Alert.alert('Confirmar', 'Guardar los cambios de configuracion?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Guardar', onPress: doSave },
      ]);
    }
  };

  const handleVideoUpload = async (banco: string, file: { uri: string; name: string; type: string }) => {
    setUploadingBanco(banco);
    try {
      const titulo = editingTitulo[banco];
      const res = await adminVideosService.updateVideo(banco, {
        titulo,
        video: file,
      });
      if (res.success && res.data) {
        setVideos(prev => prev.map(v => v.banco === banco ? res.data!.video : v));
        if (Platform.OS === 'web') {
          alert('Video subido exitosamente');
        } else {
          Alert.alert('Exito', 'Video subido exitosamente');
        }
      } else {
        const msg = res.message || 'Error al subir video';
        if (Platform.OS === 'web') alert(msg);
        else Alert.alert('Error', msg);
      }
    } catch (_e) {
      const msg = 'Error al subir video';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
    }
    setUploadingBanco(null);
  };

  const handleSaveTitulo = async (banco: string) => {
    const titulo = editingTitulo[banco];
    if (!titulo) return;
    try {
      const res = await adminVideosService.updateVideo(banco, { titulo });
      if (res.success && res.data) {
        setVideos(prev => prev.map(v => v.banco === banco ? res.data!.video : v));
        if (Platform.OS === 'web') alert('Titulo actualizado');
        else Alert.alert('Exito', 'Titulo actualizado');
      }
    } catch (_e) {
      if (Platform.OS === 'web') alert('Error al actualizar titulo');
      else Alert.alert('Error', 'Error al actualizar titulo');
    }
  };

  const pickVideoNative = async (banco: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos', 'Necesitamos acceso a tu galeria');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const filename = asset.uri.split('/').pop() || 'video.mp4';
      const ext = filename.split('.').pop()?.toLowerCase() || 'mp4';
      const mimeMap: Record<string, string> = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm' };
      const type = mimeMap[ext] || 'video/mp4';
      handleVideoUpload(banco, { uri: asset.uri, name: filename, type });
    }
  };

  const handleWebFileSelect = (banco: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      alert('Formato no permitido. Solo MP4, MOV, WEBM.');
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      alert('El archivo excede 50MB.');
      return;
    }

    const uri = URL.createObjectURL(file);
    handleVideoUpload(banco, { uri, name: file.name, type: file.type });
  };

  const triggerFilePicker = (banco: string) => {
    if (Platform.OS === 'web') {
      fileInputRefs.current[banco]?.click();
    } else {
      pickVideoNative(banco);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AdminHeader title="Configuracion" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (!config) {
    return (
      <View style={styles.container}>
        <AdminHeader title="Configuracion" />
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No se pudo cargar la configuracion</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AdminHeader title="Configuracion" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Grid de 2 columnas en desktop */}
        <View style={[styles.configGrid, isMobile && styles.configGridMobile]}>
          {/* Columna izquierda */}
          <View style={styles.configColumn}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Comisiones por Banco</Text>
              <FormField label="Comision BCP (%)" value={comisionBcp} onChangeText={setComisionBcp} keyboardType="numeric" />
              <FormField label="Comision Interbank (%)" value={comisionInterbank} onChangeText={setComisionInterbank} keyboardType="numeric" />
              <FormField label="Comision Scotiabank (%)" value={comisionScotiabank} onChangeText={setComisionScotiabank} keyboardType="numeric" />
              <FormField label="Comision BBVA (%)" value={comisionBbva} onChangeText={setComisionBbva} keyboardType="numeric" />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Referidos</Text>
              <FormField label="Bono referido (S/.)" value={bonoReferido} onChangeText={setBonoReferido} keyboardType="numeric" />
              <FormField label="Max. referidos por usuario" value={maxReferidos} onChangeText={setMaxReferidos} keyboardType="numeric" />
            </View>
          </View>

          {/* Columna derecha */}
          <View style={styles.configColumn}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Limites de Recarga</Text>
              <FormField label="Monto minimo recarga" value={montoMinRecarga} onChangeText={setMontoMinRecarga} keyboardType="numeric" />
              <FormField label="Monto maximo recarga" value={montoMaxRecarga} onChangeText={setMontoMaxRecarga} keyboardType="numeric" />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>App</Text>
              <FormField label="Version minima Android" value={versionAndroid} onChangeText={setVersionAndroid} />
              <FormField label="Version minima iOS" value={versionIos} onChangeText={setVersionIos} />
              <SwitchField label="Forzar actualizacion" value={forzarActualizacion} onValueChange={setForzarActualizacion} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Mantenimiento</Text>
              <SwitchField label="Modo mantenimiento" value={mantenimientoActivo} onValueChange={setMantenimientoActivo} />
            </View>
          </View>
        </View>

        {/* Guardar Config */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Guardando...' : 'Guardar Cambios'}</Text>
        </TouchableOpacity>

        {/* Card: Videos Instructivos */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Videos Instructivos</Text>
          <Text style={styles.cardSubtitle}>Sube videos propios (MP4, MOV, WEBM - max 50MB) para cada banco.</Text>

          {videosLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: Layout.spacing.md }} />
          ) : (
            BANCOS.map((banco) => {
              const video = videos.find(v => v.banco === banco);
              const hasVideo = !!video?.video_url;
              const isUploading = uploadingBanco === banco;

              return (
                <View key={banco} style={videoStyles.row}>
                  <View style={videoStyles.header}>
                    <Text style={videoStyles.bancoName}>{banco}</Text>
                    <View style={[videoStyles.statusBadge, hasVideo ? videoStyles.statusActive : videoStyles.statusEmpty]}>
                      <Text style={[videoStyles.statusText, hasVideo ? videoStyles.statusTextActive : videoStyles.statusTextEmpty]}>
                        {hasVideo ? 'Con video' : 'Sin video'}
                      </Text>
                    </View>
                  </View>

                  <View style={videoStyles.tituloRow}>
                    <TextInput
                      style={videoStyles.tituloInput}
                      value={editingTitulo[banco] || ''}
                      onChangeText={(val) => setEditingTitulo(prev => ({ ...prev, [banco]: val }))}
                      placeholder="Titulo del video"
                      placeholderTextColor={Colors.gray}
                    />
                    <TouchableOpacity
                      style={videoStyles.tituloSave}
                      onPress={() => handleSaveTitulo(banco)}
                    >
                      <Ionicons name="checkmark" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[videoStyles.uploadBtn, isUploading && videoStyles.uploadBtnDisabled]}
                    onPress={() => triggerFilePicker(banco)}
                    disabled={isUploading}
                    activeOpacity={0.7}
                  >
                    {isUploading ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <Ionicons name="cloud-upload" size={18} color={Colors.white} />
                    )}
                    <Text style={videoStyles.uploadBtnText}>
                      {isUploading ? 'Subiendo...' : hasVideo ? 'Reemplazar video' : 'Subir video'}
                    </Text>
                  </TouchableOpacity>

                  {/* Hidden file input for web */}
                  {Platform.OS === 'web' && (
                    <input
                      ref={(el) => { fileInputRefs.current[banco] = el; }}
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm"
                      style={{ display: 'none' }}
                      onChange={(e) => handleWebFileSelect(banco, e)}
                    />
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function FormField({ label, value, onChangeText, keyboardType }: {
  label: string;
  value: string;
  onChangeText: (val: string) => void;
  keyboardType?: 'numeric' | 'default';
}) {
  return (
    <View style={fieldStyles.container}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={fieldStyles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        placeholderTextColor={Colors.gray}
      />
    </View>
  );
}

function SwitchField({ label, value, onValueChange }: {
  label: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
}) {
  return (
    <View style={fieldStyles.switchRow}>
      <Text style={fieldStyles.label}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.inputBorder, true: `${Colors.primary}80` }}
        thumbColor={value ? Colors.primary : Colors.gray}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  container: {
    marginBottom: Layout.spacing.md,
  },
  label: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: Layout.borderRadius.sm,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    color: Colors.white,
    fontSize: Layout.fontSize.sm,
    height: 40,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Layout.spacing.sm,
  },
});

const videoStyles = StyleSheet.create({
  row: {
    borderTopWidth: 1,
    borderTopColor: Colors.inputBorder,
    paddingTop: Layout.spacing.md,
    marginTop: Layout.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.sm,
  },
  bancoName: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.white,
  },
  statusBadge: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.sm,
  },
  statusActive: {
    backgroundColor: '#16a34a20',
  },
  statusEmpty: {
    backgroundColor: '#f5920020',
  },
  statusText: {
    fontSize: Layout.fontSize.xs,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#16a34a',
  },
  statusTextEmpty: {
    color: '#f59200',
  },
  tituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.sm,
  },
  tituloInput: {
    flex: 1,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: Layout.borderRadius.sm,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.xs,
    color: Colors.white,
    fontSize: Layout.fontSize.sm,
    height: 36,
  },
  tituloSave: {
    width: 36,
    height: 36,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Layout.spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: Layout.borderRadius.sm,
    paddingVertical: Layout.spacing.sm,
  },
  uploadBtnDisabled: {
    opacity: 0.6,
  },
  uploadBtnText: {
    color: Colors.white,
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Layout.spacing.xl,
    gap: Layout.spacing.lg,
    paddingBottom: Layout.spacing.xxl,
  },
  configGrid: {
    flexDirection: 'row',
    gap: Layout.spacing.lg,
  },
  configGridMobile: {
    flexDirection: 'column',
  },
  configColumn: {
    flex: 1,
    gap: Layout.spacing.lg,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.lg,
  },
  cardTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: Layout.spacing.md,
  },
  cardSubtitle: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
  },
  emptyText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: Layout.borderRadius.sm,
    paddingVertical: Layout.spacing.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
  },
});
