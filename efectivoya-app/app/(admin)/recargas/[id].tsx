import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Linking,
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
import { adminRecargasService } from '../../../src/services/adminRecargas.service';
import { useResponsive } from '../../../src/hooks/useResponsive';
import type { AdminRecargaDetalle } from '../../../src/types/admin';

export default function AdminRecargaDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<AdminRecargaDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRechazo, setShowRechazo] = useState(false);
  const [showAprobar, setShowAprobar] = useState(false);
  const [message, setMessage] = useState('');
  const { isMobile } = useResponsive();

  const fetchDetalle = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const res = await adminRecargasService.getDetalle(id);
    if (res.success && res.data) setData(res.data);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchDetalle(); }, [fetchDetalle]);

  const handleAprobar = async () => {
    if (!id) return;
    setActionLoading(true);
    const res = await adminRecargasService.aprobar(id);
    setActionLoading(false);
    setShowAprobar(false);
    if (res.success) {
      setMessage('✓ Recarga aprobada exitosamente. El saldo fue acreditado al usuario.');
      fetchDetalle();
    } else {
      setMessage(res.message || 'No se pudo aprobar la recarga');
    }
  };

  const handleRechazar = async (motivo: string) => {
    if (!id) return;
    setActionLoading(true);
    const res = await adminRecargasService.rechazar(id, motivo);
    setActionLoading(false);
    setShowRechazo(false);
    if (res.success) {
      setMessage('Recarga rechazada. Se notificó al usuario.');
      fetchDetalle();
    } else {
      setMessage(res.message || 'No se pudo rechazar la recarga');
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
        <AdminHeader title="Detalle Recarga" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.container}>
        <AdminHeader title="Detalle Recarga" />
        <View style={styles.centered}>
          <Text style={styles.errorText}>No se encontró la recarga</Text>
        </View>
      </View>
    );
  }

  const { recarga, usuario } = data;
  const isPendiente = recarga.estado === 'pendiente';

  return (
    <View style={styles.container}>
      <AdminHeader title="Detalle Recarga" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={Colors.primary} />
          <Text style={styles.backText}>Volver a recargas</Text>
        </TouchableOpacity>

        {/* Message banner */}
        {message ? (
          <View style={styles.messageBanner}>
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        <View style={[styles.grid, isMobile && styles.gridMobile]}>
          {/* Left column: Recarga info + Usuario */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información de Recarga</Text>
            <View style={styles.card}>
              <InfoRow label="Operación" value={recarga.numeroOperacion} />
              <InfoRow label="Banco" value={recarga.bancoOrigen} />
              <InfoRow label="Monto Depositado" value={formatCurrency(recarga.montoDepositado)} />
              <InfoRow label="Comisión" value={`${Number(recarga.porcentajeComision)}% = ${formatCurrency(recarga.comision)}`} />
              <InfoRow label="Monto Neto" value={formatCurrency(recarga.montoNeto)} highlight />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Estado</Text>
                <StatusBadge status={recarga.estado} />
              </View>
              <InfoRow label="Fecha" value={formatDate(recarga.fechaCreacion)} />
              {recarga.fechaProcesamiento && (
                <InfoRow label="Procesado" value={formatDate(recarga.fechaProcesamiento)} />
              )}
              {recarga.motivoRechazo && (
                <InfoRow label="Motivo Rechazo" value={recarga.motivoRechazo} />
              )}
              {recarga.admin && (
                <InfoRow label="Admin" value={recarga.admin.nombre} />
              )}
              {recarga.comprobantePdfUrl && (
                <TouchableOpacity onPress={() => Linking.openURL(recarga.comprobantePdfUrl!)}>
                  <Text style={styles.linkText}>Ver comprobante PDF</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Usuario info - below recarga info */}
            <Text style={[styles.sectionTitle, { marginTop: Layout.spacing.xl }]}>Usuario</Text>
            <View style={styles.card}>
              <InfoRow label="Nombre" value={`${usuario.nombres} ${usuario.apellidos}`} />
              <InfoRow label="Email" value={usuario.email} />
              <InfoRow label="DNI" value={usuario.dni} />
              <InfoRow label="WhatsApp" value={usuario.whatsapp} />
              <InfoRow label="Departamento" value={usuario.departamento || '—'} />
              <InfoRow label="Distrito" value={usuario.distrito || '—'} />
              <InfoRow label="Dirección" value={usuario.direccion || '—'} />
              <InfoRow label="Saldo Actual" value={formatCurrency(usuario.saldoActual)} />
              <InfoRow label="Total Recargas" value={String(usuario.totalRecargas)} />
              <InfoRow label="Aprobadas" value={String(usuario.recargasAprobadas)} />
              {usuario.alertasActivas > 0 && (
                <InfoRow label="Alertas Activas" value={String(usuario.alertasActivas)} highlight />
              )}
            </View>
          </View>

          {/* Right column: Boucher */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Boucher</Text>
            <View style={styles.boucherCard}>
              {recarga.boucherUrl ? (
                <TouchableOpacity onPress={() => Linking.openURL(recarga.boucherUrl)}>
                  <Image
                    source={{ uri: recarga.boucherUrl }}
                    style={[styles.boucherImage, isMobile && styles.boucherImageMobile]}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              ) : (
                <Text style={styles.noBoucher}>Sin boucher</Text>
              )}
            </View>
          </View>
        </View>

        {/* Actions */}
        {isPendiente && (
          <View style={[styles.actions, isMobile && styles.actionsMobile]}>
            <Button
              title="Aprobar Recarga"
              onPress={() => setShowAprobar(true)}
              style={{ ...styles.approveButton, ...(isMobile ? styles.buttonMobile : {}) }}
            />
            <Button
              title="Rechazar Recarga"
              onPress={() => setShowRechazo(true)}
              variant="outline"
              style={{ ...styles.rejectButton, ...(isMobile ? styles.buttonMobile : {}) }}
              textStyle={{ color: Colors.error }}
            />
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <ConfirmDialog
        visible={showAprobar}
        title="Aprobar Recarga"
        message={`¿Confirmas aprobar la recarga ${recarga.numeroOperacion} por ${formatCurrency(recarga.montoDepositado)}? Se acreditará ${formatCurrency(recarga.montoNeto)} al usuario.`}
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
    alignItems: 'flex-start',
  },
  gridMobile: {
    flexDirection: 'column-reverse',
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
  boucherCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: Layout.borderRadius.md,
    padding: Layout.spacing.sm,
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
  boucherImage: {
    width: '100%',
    height: 750,
    borderRadius: Layout.borderRadius.sm,
  },
  boucherImageMobile: {
    height: 550,
  },
  noBoucher: {
    color: Colors.gray,
    fontSize: Layout.fontSize.sm,
    textAlign: 'center',
    padding: Layout.spacing.xxl,
  },
  linkText: {
    color: Colors.primary,
    fontSize: Layout.fontSize.sm,
    marginTop: Layout.spacing.md,
    textDecorationLine: 'underline',
  },
  actions: {
    flexDirection: 'row',
    gap: Layout.spacing.md,
    marginTop: Layout.spacing.xxl,
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
