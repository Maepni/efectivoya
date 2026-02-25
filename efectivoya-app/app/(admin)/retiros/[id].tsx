import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AdminHeader } from '../../../src/components/admin/AdminHeader';
import { StatusBadge } from '../../../src/components/admin/StatusBadge';
import { Button } from '../../../src/components/Button';
import { RechazoModal } from '../../../src/components/admin/RechazoModal';
import { ConfirmDialog } from '../../../src/components/ConfirmDialog';
import { Colors } from '../../../src/constants/colors';
import { Layout } from '../../../src/constants/layout';
import { adminRetirosService } from '../../../src/services/adminRetiros.service';
import { useResponsive } from '../../../src/hooks/useResponsive';
import type { AdminRetiroDetalle } from '../../../src/types/admin';

export default function AdminRetiroDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<AdminRetiroDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRechazo, setShowRechazo] = useState(false);
  const [showAprobar, setShowAprobar] = useState(false);
  const [referenciaBanco, setReferenciaBanco] = useState('');
  const [message, setMessage] = useState('');
  const { isMobile } = useResponsive();

  const fetchDetalle = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await adminRetirosService.getDetalle(id);
    if (res.success && res.data) setData(res.data);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchDetalle(); }, [fetchDetalle]);

  const handleAprobar = async () => {
    if (!id) return;
    setActionLoading(true);
    const res = await adminRetirosService.aprobar(id, referenciaBanco.trim() || undefined);
    setActionLoading(false);
    setShowAprobar(false);
    if (res.success) {
      setReferenciaBanco('');
      setMessage('Retiro aprobado exitosamente. Recuerda transferir el dinero al usuario.');
      fetchDetalle();
    } else {
      setMessage(res.message || 'Error al aprobar');
    }
  };

  const handleRechazar = async (motivo: string) => {
    if (!id) return;
    setActionLoading(true);
    const res = await adminRetirosService.rechazar(id, motivo);
    setActionLoading(false);
    setShowRechazo(false);
    if (res.success) {
      setMessage('Retiro rechazado');
      fetchDetalle();
    } else {
      setMessage(res.message || 'Error al rechazar');
    }
  };

  const formatCurrency = (val: number | string) => `S/. ${Number(val).toFixed(2)}`;
  const formatDate = (val: string) =>
    new Date(val).toLocaleDateString('es-PE', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  if (loading) {
    return (
      <View style={styles.container}>
        <AdminHeader title="Detalle Retiro" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <AdminHeader title="Detalle Retiro" />
        <View style={styles.centered}>
          <Text style={styles.errorText}>No se encontró el retiro</Text>
        </View>
      </View>
    );
  }

  const { retiro } = data;
  const isPendiente = retiro.estado === 'pendiente';

  return (
    <View style={styles.container}>
      <AdminHeader title="Detalle Retiro" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
          <Text style={styles.backText}>Volver a retiros</Text>
        </TouchableOpacity>

        {/* Message banner */}
        {message ? (
          <View style={styles.messageBanner}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        <View style={[styles.grid, isMobile && styles.gridMobile]}>
          {/* Retiro info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información del Retiro</Text>
            <View style={styles.card}>
              <InfoRow label="Operación" value={retiro.numero_operacion} />
              <InfoRow label="Monto" value={formatCurrency(retiro.monto)} highlight />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Estado</Text>
                <StatusBadge status={retiro.estado} />
              </View>
              <InfoRow label="Fecha" value={formatDate(retiro.created_at)} />
              {retiro.processed_at && (
                <InfoRow label="Procesado" value={formatDate(retiro.processed_at)} />
              )}
              {retiro.motivo_rechazo && (
                <InfoRow label="Motivo Rechazo" value={retiro.motivo_rechazo} />
              )}
              {retiro.referencia_banco && (
                <InfoRow label="Ref. Transferencia" value={retiro.referencia_banco} />
              )}
              {retiro.admin && (
                <InfoRow label="Admin" value={retiro.admin.nombre} />
              )}
              {retiro.comprobante_pdf_url && (
                <TouchableOpacity onPress={() => Linking.openURL(retiro.comprobante_pdf_url!)}>
                  <Text style={styles.linkText}>Ver comprobante PDF</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Banco destino + Usuario */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Banco Destino</Text>
            <View style={styles.card}>
              <InfoRow label="Banco" value={retiro.banco?.banco ?? '-'} />
              <InfoRow label="Cuenta" value={retiro.banco?.numero_cuenta ?? '-'} />
              <InfoRow label="CCI" value={retiro.banco?.cci ?? '-'} />
              {retiro.banco?.alias && (
                <InfoRow label="Alias" value={retiro.banco.alias} />
              )}
            </View>

            <Text style={[styles.sectionTitle, { marginTop: Layout.spacing.xl }]}>Usuario</Text>
            <View style={styles.card}>
              <InfoRow label="Nombre" value={`${retiro.usuario.nombres} ${retiro.usuario.apellidos}`} />
              <InfoRow label="Email" value={retiro.usuario.email} />
              <InfoRow label="DNI" value={retiro.usuario.dni} />
              <InfoRow label="WhatsApp" value={retiro.usuario.whatsapp} />
              <InfoRow label="Departamento" value={retiro.usuario.departamento || '—'} />
              <InfoRow label="Distrito" value={retiro.usuario.distrito || '—'} />
              <InfoRow label="Dirección" value={retiro.usuario.direccion || '—'} />
              <InfoRow label="Saldo Actual" value={formatCurrency(retiro.usuario.saldo_actual)} />
            </View>
          </View>
        </View>

        {/* Actions */}
        {isPendiente && (
          <View style={styles.actionsContainer}>
            <Text style={styles.refLabel}>N° de operación bancaria (opcional)</Text>
            <TextInput
              style={styles.refInput}
              placeholder="Ej: 123456789 — ingresar después de transferir"
              placeholderTextColor={Colors.gray}
              value={referenciaBanco}
              onChangeText={setReferenciaBanco}
              autoCapitalize="none"
            />
            <View style={[styles.actions, isMobile && styles.actionsMobile]}>
              <Button
                title="Aprobar Retiro"
                onPress={() => setShowAprobar(true)}
                style={{ ...styles.approveButton, ...(isMobile ? styles.buttonMobile : {}) }}
              />
              <Button
                title="Rechazar Retiro"
                onPress={() => setShowRechazo(true)}
                variant="outline"
                style={{ ...styles.rejectButton, ...(isMobile ? styles.buttonMobile : {}) }}
                textStyle={{ color: Colors.error }}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <ConfirmDialog
        visible={showAprobar}
        title="Aprobar Retiro"
        message={`¿Confirmas aprobar el retiro ${retiro.numero_operacion} por ${formatCurrency(retiro.monto)}? Se transferirá a la cuenta ${retiro.banco?.banco ?? ''} ${retiro.banco?.numero_cuenta ?? ''}.`}
        buttons={[
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Aprobar', onPress: handleAprobar },
        ]}
        onDismiss={() => setShowAprobar(false)}
      />

      <RechazoModal
        visible={showRechazo}
        onDismiss={() => setShowRechazo(false)}
        onConfirm={handleRechazar}
        loading={actionLoading}
      />
    </View>
  );
}

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={[infoStyles.value, highlight && infoStyles.valueHighlight]}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
    flex: 1,
  },
  value: {
    fontSize: Layout.fontSize.sm,
    color: Colors.text,
    flex: 1.5,
    textAlign: 'right',
  },
  valueHighlight: {
    color: Colors.success,
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
  errorText: {
    color: Colors.gray,
    fontSize: Layout.fontSize.md,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Layout.spacing.xl,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  backText: {
    color: Colors.primary,
    fontSize: Layout.fontSize.sm,
    marginLeft: Layout.spacing.sm,
  },
  messageBanner: {
    backgroundColor: `${Colors.success}20`,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.sm,
    marginBottom: Layout.spacing.lg,
  },
  messageText: {
    color: Colors.success,
    fontSize: Layout.fontSize.sm,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    gap: Layout.spacing.xl,
  },
  gridMobile: {
    flexDirection: 'column',
  },
  section: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.md,
    fontWeight: '600',
    color: Colors.accent,
    marginBottom: Layout.spacing.md,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
    flex: 1,
  },
  linkText: {
    color: Colors.primary,
    fontSize: Layout.fontSize.sm,
    marginTop: Layout.spacing.md,
    textDecorationLine: 'underline',
  },
  actionsContainer: {
    marginTop: Layout.spacing.xxl,
  },
  refLabel: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    marginBottom: Layout.spacing.sm,
  },
  refInput: {
    backgroundColor: Colors.cardBackground,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.sm,
    padding: Layout.spacing.md,
    color: Colors.text,
    fontSize: Layout.fontSize.sm,
    marginBottom: Layout.spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: Layout.spacing.md,
    justifyContent: 'center',
  },
  actionsMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  approveButton: {
    backgroundColor: Colors.success,
    minWidth: 180,
  },
  rejectButton: {
    borderColor: Colors.error,
    minWidth: 180,
  },
  buttonMobile: {
    minWidth: 0,
  },
});
