import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { Card } from '../../src/components/Card';
import { OperacionCard } from '../../src/components/OperacionCard';
import { BancoCard } from '../../src/components/BancoCard';
import { LoadingScreen } from '../../src/components/LoadingScreen';
import RetirosService from '../../src/services/retiros.service';
import BancosService from '../../src/services/bancos.service';
import { useAuthStore } from '../../src/store/authStore';
import type { Retiro, UserBank } from '../../src/types';
import { Colors } from '../../src/constants/colors';
import { Layout } from '../../src/constants/layout';
import { useResponsive } from '../../src/hooks/useResponsive';

const BANCOS = ['BCP', 'Interbank', 'Scotiabank', 'BBVA'] as const;

const BANK_ACCOUNT_RULES: Record<string, { lengths: number[]; label: string }> = {
  BCP_ahorros: { lengths: [14], label: '14 dígitos' },
  BCP_corriente: { lengths: [13], label: '13 dígitos' },
  Interbank: { lengths: [13], label: '13 dígitos' },
  Scotiabank: { lengths: [10], label: '10 dígitos' },
  BBVA: { lengths: [18], label: '18 dígitos' },
};

export default function RetirosScreen() {
  const insets = useSafeAreaInsets();
  const { isDesktop } = useResponsive();
  const { user, refreshUser } = useAuthStore();
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [bancos, setBancos] = useState<UserBank[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [bancosModalVisible, setBancosModalVisible] = useState(false);
  const [addBancoModalVisible, setAddBancoModalVisible] = useState(false);

  const [selectedBancoId, setSelectedBancoId] = useState('');
  const [monto, setMonto] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [nuevoBanco, setNuevoBanco] = useState({
    banco: '' as 'BCP' | 'Interbank' | 'Scotiabank' | 'BBVA' | '',
    tipo_cuenta: '' as 'ahorros' | 'corriente' | '',
    numero_cuenta: '',
    cci: '',
    alias: '',
  });
  const [addingBanco, setAddingBanco] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [retirosRes, bancosRes] = await Promise.all([
        RetirosService.getHistorial({ page: 1, limit: 50 }),
        BancosService.getBancos(),
      ]);

      if (retirosRes.success && retirosRes.data) {
        setRetiros(retirosRes.data.retiros || []);
      }
      if (bancosRes.success && bancosRes.data) {
        setBancos(bancosRes.data.bancos || []);
      }
    } catch (error) {
      if (__DEV__) console.error('Error al cargar retiros:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      refreshUser();
    }, [loadData, refreshUser])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    refreshUser();
  };

  const maskAccount = (num: string) => {
    if (num.length <= 4) return num;
    return '****' + num.slice(-4);
  };

  const handleSubmitRetiro = async () => {
    if (!selectedBancoId) {
      Alert.alert('Error', 'Selecciona una cuenta bancaria');
      return;
    }
    if (!monto) {
      Alert.alert('Error', 'Ingresa el monto a retirar');
      return;
    }
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      Alert.alert('Error', 'Monto inválido');
      return;
    }
    const saldoActual = Number(user?.saldo_actual || 0);
    if (montoNum > saldoActual) {
      Alert.alert(
        'Error',
        `Saldo insuficiente. Tu saldo actual es S/. ${saldoActual.toFixed(2)}`
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await RetirosService.solicitarRetiro({
        user_bank_id: selectedBancoId,
        monto: montoNum,
      });

      if (response.success) {
        setModalVisible(false);
        resetForm();
        loadData();
        refreshUser();
        Alert.alert(
          '¡Solicitud Enviada!',
          'Tu retiro está siendo procesado. Te notificaremos cuando sea aprobado.'
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
    setSelectedBancoId('');
    setMonto('');
  };

  const handleVerComprobante = (retiro: Retiro) => {
    if (retiro.estado !== 'aprobado') {
      Alert.alert('Info', 'El comprobante estará disponible cuando se apruebe el retiro');
      return;
    }
    if (!retiro.comprobante_pdf_url) {
      Alert.alert('Info', 'El comprobante aún está siendo generado. Intenta de nuevo en un momento.');
      return;
    }
    Linking.openURL(retiro.comprobante_pdf_url);
  };

  const getBankRuleKey = (banco: string, tipoCuenta: string) => {
    if (banco === 'BCP' && tipoCuenta) return `BCP_${tipoCuenta}`;
    return banco;
  };

  const getCuentaPlaceholder = () => {
    if (!nuevoBanco.banco) return 'Selecciona un banco primero';
    if (nuevoBanco.banco === 'BCP' && !nuevoBanco.tipo_cuenta) return 'Selecciona tipo de cuenta';
    const key = getBankRuleKey(nuevoBanco.banco, nuevoBanco.tipo_cuenta);
    const rule = BANK_ACCOUNT_RULES[key];
    return rule ? rule.label : 'Número de cuenta';
  };

  const handleAddBanco = async () => {
    if (!nuevoBanco.banco) {
      Alert.alert('Error', 'Selecciona un banco');
      return;
    }
    if (nuevoBanco.banco === 'BCP' && !nuevoBanco.tipo_cuenta) {
      Alert.alert('Error', 'Selecciona el tipo de cuenta para BCP');
      return;
    }
    if (!nuevoBanco.numero_cuenta) {
      Alert.alert('Error', 'Ingresa el número de cuenta');
      return;
    }
    const ruleKey = getBankRuleKey(nuevoBanco.banco, nuevoBanco.tipo_cuenta);
    const rule = BANK_ACCOUNT_RULES[ruleKey];
    if (rule && !rule.lengths.includes(nuevoBanco.numero_cuenta.length)) {
      Alert.alert('Error', `El número de cuenta debe tener ${rule.label}`);
      return;
    }
    if (!nuevoBanco.cci) {
      Alert.alert('Error', 'Ingresa el CCI');
      return;
    }
    if (nuevoBanco.cci.length !== 20) {
      Alert.alert('Error', 'El CCI debe tener exactamente 20 dígitos');
      return;
    }
    if (!nuevoBanco.alias) {
      Alert.alert('Error', 'Ingresa un alias para identificar la cuenta');
      return;
    }

    setAddingBanco(true);
    try {
      const response = await BancosService.createBanco({
        banco: nuevoBanco.banco as 'BCP' | 'Interbank' | 'Scotiabank' | 'BBVA',
        ...(nuevoBanco.tipo_cuenta ? { tipo_cuenta: nuevoBanco.tipo_cuenta } : {}),
        numero_cuenta: nuevoBanco.numero_cuenta,
        cci: nuevoBanco.cci,
        alias: nuevoBanco.alias,
      });

      if (response.success) {
        setAddBancoModalVisible(false);
        resetNuevoBancoForm();
        loadData();
        Alert.alert('¡Éxito!', 'Cuenta bancaria agregada correctamente');
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Error al agregar cuenta'
      );
    } finally {
      setAddingBanco(false);
    }
  };

  const resetNuevoBancoForm = () => {
    setNuevoBanco({ banco: '', tipo_cuenta: '', numero_cuenta: '', cci: '', alias: '' });
  };

  const handleDeleteBanco = async (id: string) => {
    try {
      const response = await BancosService.deleteBanco(id);
      if (response.success) {
        Alert.alert('Éxito', 'Cuenta eliminada correctamente');
        loadData();
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Error al eliminar cuenta'
      );
    }
  };

  if (loading) return <LoadingScreen />;

  const saldoActual = Number(user?.saldo_actual || 0);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Retiros</Text>
        </View>

        <TouchableOpacity
          style={styles.mainActionButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-down-circle-outline" size={24} color={Colors.white} />
          <Text style={styles.mainActionButtonText}>Solicitar Retiro</Text>
        </TouchableOpacity>

        <Card style={styles.saldoCard}>
          <Text style={styles.saldoLabel}>Saldo Disponible</Text>
          <Text style={styles.saldoAmount}>
            S/. {saldoActual.toFixed(2)}
          </Text>
          <Text style={styles.saldoSubtext}>
            Puedes retirar todo tu saldo sin comisión
          </Text>
        </Card>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mis Cuentas</Text>
            <TouchableOpacity onPress={() => setBancosModalVisible(true)}>
              <Text style={styles.seeAllText}>Gestionar</Text>
            </TouchableOpacity>
          </View>

          {bancos.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="card-outline" size={48} color={Colors.gray} />
              <Text style={styles.emptyText}>
                No tienes cuentas registradas
              </Text>
              <Button
                title="Agregar Cuenta"
                onPress={() => setAddBancoModalVisible(true)}
                style={styles.addCuentaButton}
              />
            </Card>
          ) : (
            bancos.slice(0, 2).map((banco) => (
              <BancoCard key={banco.id} banco={banco} />
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial</Text>
          {retiros.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="document-text-outline"
                size={64}
                color={Colors.gray}
              />
              <Text style={styles.emptyText}>No tienes retiros aún</Text>
            </View>
          ) : (
            retiros.map((retiro) => (
              <OperacionCard
                key={retiro.id}
                tipo="retiro"
                numero_operacion={retiro.numero_operacion}
                monto={Number(retiro.monto)}
                estado={retiro.estado}
                fecha={retiro.created_at}
                banco={retiro.banco?.banco}
                motivo_rechazo={retiro.motivo_rechazo}
                onPress={() => handleVerComprobante(retiro)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal Nuevo Retiro */}
      <Modal
        visible={modalVisible}
        animationType={isDesktop ? 'fade' : 'slide'}
        transparent={isDesktop}
      >
        <View style={[styles.modalContainer, isDesktop && styles.modalOverlay]}>
          <View style={isDesktop ? styles.modalDialog : styles.modalDialogFull}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nuevo Retiro</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={28} color={Colors.accent} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: insets.bottom }}>
            <Card style={styles.saldoModalCard}>
              <Text style={styles.saldoModalLabel}>Saldo Disponible</Text>
              <Text style={styles.saldoModalAmount}>
                S/. {saldoActual.toFixed(2)}
              </Text>
            </Card>

            <Text style={styles.label}>Cuenta de Destino *</Text>
            {bancos.length === 0 ? (
              <Card style={styles.noBancosCard}>
                <Text style={styles.noBancosText}>
                  No tienes cuentas registradas
                </Text>
                <Button
                  title="Agregar Cuenta"
                  onPress={() => {
                    setModalVisible(false);
                    setAddBancoModalVisible(true);
                  }}
                  variant="outline"
                  style={styles.addCuentaInlineButton}
                />
              </Card>
            ) : (
              <View style={styles.bancosSelector}>
                {bancos.map((banco) => (
                  <TouchableOpacity
                    key={banco.id}
                    style={[
                      styles.bancoSelectorItem,
                      selectedBancoId === banco.id &&
                        styles.bancoSelectorSelected,
                    ]}
                    onPress={() => setSelectedBancoId(banco.id)}
                  >
                    <View style={styles.bancoSelectorContent}>
                      <Text style={styles.bancoSelectorBanco}>
                        {banco.banco}
                      </Text>
                      {banco.alias && (
                        <Text style={styles.bancoSelectorAlias}>
                          {banco.alias}
                        </Text>
                      )}
                      <Text style={styles.bancoSelectorCuenta}>
                        {maskAccount(banco.numero_cuenta)}
                      </Text>
                    </View>
                    {selectedBancoId === banco.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={Colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Input
              label="Monto a Retirar *"
              placeholder="0.00"
              value={monto}
              onChangeText={setMonto}
              keyboardType="decimal-pad"
              icon="cash"
            />

            <Card style={styles.infoNoComision}>
              <Ionicons
                name="information-circle"
                size={24}
                color={Colors.success}
              />
              <Text style={styles.infoNoComisionText}>
                Los retiros no tienen comisión. Recibirás el monto exacto que
                solicites.
              </Text>
            </Card>

            <Button
              title="Solicitar Retiro"
              onPress={handleSubmitRetiro}
              loading={submitting}
              disabled={bancos.length === 0}
              style={styles.submitButton}
            />
          </ScrollView>
          </View>{/* /modalDialog retiro */}
        </View>
      </Modal>

      {/* Modal Gestionar Bancos */}
      <Modal
        visible={bancosModalVisible}
        animationType={isDesktop ? 'fade' : 'slide'}
        transparent={isDesktop}
      >
        <View style={[styles.modalContainer, isDesktop && styles.modalOverlay]}>
          <View style={isDesktop ? styles.modalDialog : styles.modalDialogFull}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Mis Cuentas Bancarias</Text>
            <TouchableOpacity onPress={() => setBancosModalVisible(false)}>
              <Ionicons name="close" size={28} color={Colors.accent} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: insets.bottom }}>
            <Button
              title="Agregar Nueva Cuenta"
              onPress={() => {
                setBancosModalVisible(false);
                setAddBancoModalVisible(true);
              }}
              variant="outline"
              style={styles.addNewButton}
            />
            {bancos.map((banco) => (
              <BancoCard
                key={banco.id}
                banco={banco}
                onDelete={() => handleDeleteBanco(banco.id)}
              />
            ))}
          </ScrollView>
          </View>{/* /modalDialog bancos */}
        </View>
      </Modal>

      {/* Modal Agregar Banco */}
      <Modal
        visible={addBancoModalVisible}
        animationType={isDesktop ? 'fade' : 'slide'}
        transparent={isDesktop}
      >
        <View style={[styles.modalContainer, isDesktop && styles.modalOverlay]}>
          <View style={isDesktop ? styles.modalDialog : styles.modalDialogFull}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Agregar Cuenta</Text>
            <TouchableOpacity onPress={() => setAddBancoModalVisible(false)}>
              <Ionicons name="close" size={28} color={Colors.accent} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: insets.bottom }}>
            <Text style={styles.label}>Banco *</Text>
            <View style={styles.bancosGrid}>
              {BANCOS.map((banco) => (
                <TouchableOpacity
                  key={banco}
                  style={[
                    styles.bancoOption,
                    nuevoBanco.banco === banco && styles.bancoSelected,
                  ]}
                  onPress={() => setNuevoBanco({ ...nuevoBanco, banco, tipo_cuenta: '', numero_cuenta: '' })}
                >
                  <Text
                    style={[
                      styles.bancoText,
                      nuevoBanco.banco === banco && styles.bancoTextSelected,
                    ]}
                  >
                    {banco}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {nuevoBanco.banco === 'BCP' && (
              <>
                <Text style={styles.label}>Tipo de Cuenta *</Text>
                <View style={styles.bancosGrid}>
                  {(['ahorros', 'corriente'] as const).map((tipo) => (
                    <TouchableOpacity
                      key={tipo}
                      style={[
                        styles.bancoOption,
                        nuevoBanco.tipo_cuenta === tipo && styles.bancoSelected,
                      ]}
                      onPress={() => setNuevoBanco({ ...nuevoBanco, tipo_cuenta: tipo, numero_cuenta: '' })}
                    >
                      <Text
                        style={[
                          styles.bancoText,
                          nuevoBanco.tipo_cuenta === tipo && styles.bancoTextSelected,
                        ]}
                      >
                        {tipo === 'ahorros' ? 'Ahorros' : 'Corriente'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Input
              label="Número de Cuenta *"
              placeholder={getCuentaPlaceholder()}
              value={nuevoBanco.numero_cuenta}
              onChangeText={(text) =>
                setNuevoBanco({ ...nuevoBanco, numero_cuenta: text })
              }
              keyboardType="number-pad"
              icon="card"
            />
            <Input
              label="CCI *"
              placeholder="20 dígitos"
              value={nuevoBanco.cci}
              onChangeText={(text) =>
                setNuevoBanco({ ...nuevoBanco, cci: text })
              }
              keyboardType="number-pad"
              icon="keypad"
            />
            <Input
              label="Alias *"
              placeholder="Ej: Mi cuenta principal"
              value={nuevoBanco.alias}
              onChangeText={(text) =>
                setNuevoBanco({ ...nuevoBanco, alias: text })
              }
              icon="create"
            />
            <Button
              title="Agregar Cuenta"
              onPress={handleAddBanco}
              loading={addingBanco}
              style={styles.submitButton}
            />
          </ScrollView>
          </View>{/* /modalDialog agregar banco */}
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
    backgroundColor: Colors.secondary,
    borderRadius: Layout.borderRadius.lg,
    paddingVertical: Layout.spacing.lg,
    marginHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
    gap: Layout.spacing.sm,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  mainActionButtonText: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.background,
  },
  saldoCard: {
    marginHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
  },
  saldoLabel: { fontSize: Layout.fontSize.sm, color: Colors.white, opacity: 0.9 },
  saldoAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.white,
    marginVertical: Layout.spacing.sm,
  },
  saldoSubtext: { fontSize: Layout.fontSize.xs, color: Colors.white, opacity: 0.8 },
  section: { padding: Layout.spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Layout.spacing.md,
  },
  sectionTitle: {
    fontSize: Layout.fontSize.lg,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  seeAllText: { color: Colors.primary, fontSize: Layout.fontSize.sm, fontWeight: '600' },
  emptyCard: { alignItems: 'center', paddingVertical: Layout.spacing.xl },
  emptyText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    marginTop: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  addCuentaButton: { marginTop: Layout.spacing.sm },
  emptyState: { alignItems: 'center', paddingVertical: Layout.spacing.xl * 2 },
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalOverlay: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  modalDialog: {
    width: '90%',
    maxWidth: 560,
    maxHeight: '88%' as any,
    backgroundColor: Colors.background,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalDialogFull: { flex: 1 },
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
  saldoModalCard: {
    backgroundColor: Colors.secondary + '20',
    alignItems: 'center',
    marginBottom: Layout.spacing.lg,
  },
  saldoModalLabel: { fontSize: Layout.fontSize.sm, color: Colors.text },
  saldoModalAmount: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    color: Colors.secondary,
    marginTop: Layout.spacing.xs,
  },
  label: {
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Layout.spacing.sm,
  },
  noBancosCard: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.xl,
    marginBottom: Layout.spacing.md,
  },
  noBancosText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    marginBottom: Layout.spacing.md,
  },
  addCuentaInlineButton: { minWidth: 200 },
  bancosSelector: { marginBottom: Layout.spacing.md },
  bancoSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.lightGray,
    marginBottom: Layout.spacing.sm,
  },
  bancoSelectorSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  bancoSelectorContent: { flex: 1 },
  bancoSelectorBanco: {
    fontSize: Layout.fontSize.md,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  bancoSelectorAlias: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    marginTop: 2,
  },
  bancoSelectorCuenta: {
    fontSize: Layout.fontSize.xs,
    color: Colors.text,
    marginTop: 2,
  },
  infoNoComision: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '10',
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  infoNoComisionText: { flex: 1, fontSize: Layout.fontSize.sm, color: Colors.text },
  submitButton: { marginTop: Layout.spacing.md, marginBottom: Layout.spacing.xl },
  addNewButton: { marginBottom: Layout.spacing.lg },
  bancosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  bancoOption: {
    flexBasis: '48%',
    alignItems: 'center',
    justifyContent: 'center',
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
  bancoText: { fontSize: Layout.fontSize.md, color: Colors.text, fontWeight: '500' },
  bancoTextSelected: { color: Colors.primary, fontWeight: 'bold' },
});
