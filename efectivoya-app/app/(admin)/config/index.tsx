import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TextInput, Switch, TouchableOpacity, Alert, Platform } from 'react-native';
import { AdminHeader } from '../../../src/components/admin/AdminHeader';
import { Colors } from '../../../src/constants/colors';
import { Layout } from '../../../src/constants/layout';
import { adminConfigService } from '../../../src/services/adminConfig.service';
import type { AdminConfig } from '../../../src/types/admin';

export default function AdminConfigScreen() {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [porcentajeComision, setPorcentajeComision] = useState('');
  const [montoMinRecarga, setMontoMinRecarga] = useState('');
  const [montoMaxRecarga, setMontoMaxRecarga] = useState('');
  const [bonoReferido, setBonoReferido] = useState('');
  const [maxReferidos, setMaxReferidos] = useState('');
  const [cuentaBanco, setCuentaBanco] = useState('');
  const [cuentaNumero, setCuentaNumero] = useState('');
  const [cuentaTitular, setCuentaTitular] = useState('');
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
      setPorcentajeComision(String(c.porcentaje_comision));
      setMontoMinRecarga(String(c.monto_minimo_recarga));
      setMontoMaxRecarga(String(c.monto_maximo_recarga));
      setBonoReferido(String(c.bono_referido));
      setMaxReferidos(String(c.max_referidos_por_usuario));
      setCuentaBanco(c.cuenta_recaudadora_banco);
      setCuentaNumero(c.cuenta_recaudadora_numero);
      setCuentaTitular(c.cuenta_recaudadora_titular);
      setVersionAndroid(c.version_minima_android);
      setVersionIos(c.version_minima_ios);
      setForzarActualizacion(c.forzar_actualizacion);
      setMantenimientoActivo(c.mantenimiento_activo);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    const doSave = async () => {
      setSaving(true);
      const res = await adminConfigService.updateConfig({
        porcentaje_comision: Number(porcentajeComision),
        monto_minimo_recarga: Number(montoMinRecarga),
        monto_maximo_recarga: Number(montoMaxRecarga),
        bono_referido: Number(bonoReferido),
        max_referidos_por_usuario: Number(maxReferidos),
        cuenta_recaudadora_banco: cuentaBanco,
        cuenta_recaudadora_numero: cuentaNumero,
        cuenta_recaudadora_titular: cuentaTitular,
        version_minima_android: versionAndroid,
        version_minima_ios: versionIos,
        forzar_actualizacion: forzarActualizacion,
        mantenimiento_activo: mantenimientoActivo,
      });
      if (res.success && res.data) {
        setConfig(res.data.config);
        if (Platform.OS === 'web') {
          alert('Configuración guardada exitosamente');
        } else {
          Alert.alert('Éxito', 'Configuración guardada exitosamente');
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
      if (confirm('¿Guardar los cambios de configuración?')) doSave();
    } else {
      Alert.alert('Confirmar', '¿Guardar los cambios de configuración?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Guardar', onPress: doSave },
      ]);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AdminHeader title="Configuración" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (!config) {
    return (
      <View style={styles.container}>
        <AdminHeader title="Configuración" />
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No se pudo cargar la configuración</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AdminHeader title="Configuración" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Card: Comisiones y Límites */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Comisiones y Límites</Text>
          <FormField label="Comisión (%)" value={porcentajeComision} onChangeText={setPorcentajeComision} keyboardType="numeric" />
          <FormField label="Monto mínimo recarga" value={montoMinRecarga} onChangeText={setMontoMinRecarga} keyboardType="numeric" />
          <FormField label="Monto máximo recarga" value={montoMaxRecarga} onChangeText={setMontoMaxRecarga} keyboardType="numeric" />
          <FormField label="Bono referido (S/.)" value={bonoReferido} onChangeText={setBonoReferido} keyboardType="numeric" />
          <FormField label="Máx. referidos por usuario" value={maxReferidos} onChangeText={setMaxReferidos} keyboardType="numeric" />
        </View>

        {/* Card: Cuenta Recaudadora */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cuenta Recaudadora</Text>
          <FormField label="Banco" value={cuentaBanco} onChangeText={setCuentaBanco} />
          <FormField label="Número de cuenta" value={cuentaNumero} onChangeText={setCuentaNumero} />
          <FormField label="Titular" value={cuentaTitular} onChangeText={setCuentaTitular} />
        </View>

        {/* Card: App */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>App</Text>
          <FormField label="Versión mínima Android" value={versionAndroid} onChangeText={setVersionAndroid} />
          <FormField label="Versión mínima iOS" value={versionIos} onChangeText={setVersionIos} />
          <SwitchField label="Forzar actualización" value={forzarActualizacion} onValueChange={setForzarActualizacion} />
        </View>

        {/* Card: Mantenimiento */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mantenimiento</Text>
          <SwitchField label="Modo mantenimiento" value={mantenimientoActivo} onValueChange={setMantenimientoActivo} />
        </View>

        {/* Guardar */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.7}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Guardando...' : 'Guardar Cambios'}</Text>
        </TouchableOpacity>
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
