import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { DepartamentoPicker } from '../../src/components/DepartamentoPicker';
import { Card } from '../../src/components/Card';
import { BancoCard } from '../../src/components/BancoCard';
import { ConfirmDialog } from '../../src/components/ConfirmDialog';
import BancosService from '../../src/services/bancos.service';
import { authService } from '../../src/services/auth.service';
import { useAuthStore } from '../../src/store/authStore';
import type { UserBank } from '../../src/types';
import { Colors } from '../../src/constants/colors';
import { Layout } from '../../src/constants/layout';

const BANCOS = ['BCP', 'Interbank', 'Scotiabank', 'BBVA'] as const;

const BANK_ACCOUNT_RULES: Record<string, { lengths: number[]; label: string }> = {
  BCP_ahorros: { lengths: [14], label: '14 dígitos' },
  BCP_corriente: { lengths: [13], label: '13 dígitos' },
  Interbank: { lengths: [13], label: '13 dígitos' },
  Scotiabank: { lengths: [10], label: '10 dígitos' },
  BBVA: { lengths: [18], label: '18 dígitos' },
};

export default function PerfilScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout, refreshUser } = useAuthStore();
  const [bancos, setBancos] = useState<UserBank[]>([]);
  const [bancosModalVisible, setBancosModalVisible] = useState(false);
  const [addBancoModalVisible, setAddBancoModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const [editData, setEditData] = useState({
    nombres: user?.nombres || '',
    apellidos: user?.apellidos || '',
    whatsapp: user?.whatsapp || '',
    departamento: user?.departamento || '',
    distrito: user?.distrito || '',
    direccion: user?.direccion || '',
  });
  const [updating, setUpdating] = useState(false);

  const [nuevoBanco, setNuevoBanco] = useState({
    banco: '' as 'BCP' | 'Interbank' | 'Scotiabank' | 'BBVA' | '',
    tipo_cuenta: '' as 'ahorros' | 'corriente' | '',
    numero_cuenta: '',
    cci: '',
    alias: '',
  });
  const [addingBanco, setAddingBanco] = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [editBancoModalVisible, setEditBancoModalVisible] = useState(false);
  const [editingBanco, setEditingBanco] = useState<UserBank | null>(null);
  const [editBancoData, setEditBancoData] = useState({ alias: '', cci: '' });
  const [editingBancoLoading, setEditingBancoLoading] = useState(false);

  // Sincronizar editData cuando el usuario cambia (ej. después de actualizar)
  useEffect(() => {
    setEditData({
      nombres: user?.nombres || '',
      apellidos: user?.apellidos || '',
      whatsapp: user?.whatsapp || '',
      departamento: user?.departamento || '',
      distrito: user?.distrito || '',
      direccion: user?.direccion || '',
    });
  }, [user]);

  const loadBancos = useCallback(async () => {
    try {
      const response = await BancosService.getBancos();
      if (response.success && response.data) {
        setBancos(response.data.bancos || []);
      }
    } catch (error) {
      if (__DEV__) console.error('Error al cargar bancos:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBancos();
    }, [loadBancos])
  );

  const handleLogout = () => {
    setLogoutDialogVisible(true);
  };

  const handleUpdateProfile = async () => {
    if (!editData.nombres.trim() || !editData.apellidos.trim()) {
      Alert.alert('Error', 'Nombres y apellidos son requeridos');
      return;
    }
    if (editData.whatsapp && editData.whatsapp.length !== 9) {
      Alert.alert('Error', 'WhatsApp debe tener 9 dígitos');
      return;
    }

    setUpdating(true);
    try {
      const response = await authService.updateProfile({
        nombres: editData.nombres.trim(),
        apellidos: editData.apellidos.trim(),
        ...(editData.whatsapp.trim() ? { whatsapp: editData.whatsapp.trim() } : {}),
        ...(editData.departamento ? { departamento: editData.departamento } : {}),
        ...(editData.distrito.trim() ? { distrito: editData.distrito.trim() } : {}),
        ...(editData.direccion.trim() ? { direccion: editData.direccion.trim() } : {}),
      });

      if (response.success) {
        setEditModalVisible(false);
        await refreshUser();
        Alert.alert('¡Listo!', 'Perfil actualizado correctamente');
      } else {
        Alert.alert('Error', response.message || 'Error al actualizar perfil');
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Error al actualizar perfil');
    } finally {
      setUpdating(false);
    }
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
      Alert.alert('Error', 'Ingresa un alias');
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
        loadBancos();
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

  const handleEditBanco = (banco: UserBank) => {
    setEditingBanco(banco);
    setEditBancoData({ alias: banco.alias || '', cci: banco.cci });
    setEditBancoModalVisible(true);
  };

  const handleSaveEditBanco = async () => {
    if (!editingBanco) return;
    if (!editBancoData.cci || editBancoData.cci.length !== 20) {
      Alert.alert('Error', 'El CCI debe tener exactamente 20 dígitos');
      return;
    }
    if (!editBancoData.alias) {
      Alert.alert('Error', 'Ingresa un alias');
      return;
    }

    setEditingBancoLoading(true);
    try {
      const response = await BancosService.updateBanco(editingBanco.id, {
        alias: editBancoData.alias,
        cci: editBancoData.cci,
      });
      if (response.success) {
        setEditBancoModalVisible(false);
        loadBancos();
        Alert.alert('Éxito', 'Cuenta actualizada correctamente');
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Error al actualizar cuenta'
      );
    } finally {
      setEditingBancoLoading(false);
    }
  };

  const handleDeleteBanco = async (id: string) => {
    try {
      const response = await BancosService.deleteBanco(id);
      if (response.success) {
        Alert.alert('Éxito', 'Cuenta eliminada correctamente');
        loadBancos();
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Error al eliminar cuenta'
      );
    }
  };

  const initials =
    (user?.nombres?.charAt(0) || '') + (user?.apellidos?.charAt(0) || '');

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Perfil</Text>
        </View>

        <Card style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>

          <Text style={styles.userName}>
            {user?.nombres} {user?.apellidos}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setEditModalVisible(true)}
          >
            <Ionicons name="create-outline" size={20} color={Colors.primary} />
            <Text style={styles.editButtonText}>Editar Perfil</Text>
          </TouchableOpacity>
        </Card>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información de Cuenta</Text>

          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="card" size={20} color={Colors.primary} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>DNI</Text>
                <Text style={styles.infoValue}>{user?.dni}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons
                  name="logo-whatsapp"
                  size={20}
                  color={Colors.success}
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>WhatsApp</Text>
                <Text style={styles.infoValue}>{user?.whatsapp}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons
                  name={
                    user?.email_verificado
                      ? 'checkmark-circle'
                      : 'close-circle'
                  }
                  size={20}
                  color={
                    user?.email_verificado ? Colors.success : Colors.error
                  }
                />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Estado</Text>
                <Text style={styles.infoValue}>
                  {user?.email_verificado ? 'Verificado' : 'No verificado'}
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mis Cuentas Bancarias</Text>
            <TouchableOpacity onPress={() => setBancosModalVisible(true)}>
              <Text style={styles.seeAllText}>Ver todas</Text>
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
          <TouchableOpacity style={styles.optionButton}>
            <Ionicons
              name="help-circle-outline"
              size={24}
              color={Colors.text}
            />
            <Text style={styles.optionText}>Ayuda y Soporte</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionButton}>
            <Ionicons
              name="document-text-outline"
              size={24}
              color={Colors.text}
            />
            <Text style={styles.optionText}>Términos y Condiciones</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionButton}>
            <Ionicons
              name="shield-checkmark-outline"
              size={24}
              color={Colors.text}
            />
            <Text style={styles.optionText}>Políticas de Privacidad</Text>
            <Ionicons name="chevron-forward" size={20} color={Colors.gray} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionButton, styles.logoutButton]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color={Colors.error} />
            <Text style={[styles.optionText, { color: Colors.error }]}>
              Cerrar Sesión
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionText}>Versión 1.0.0</Text>
      </ScrollView>

      {/* Modal Editar Perfil */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar Perfil</Text>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Ionicons name="close" size={28} color={Colors.accent} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: insets.bottom }}>
            <Input
              label="Nombres"
              placeholder="Tus nombres"
              value={editData.nombres}
              onChangeText={(text) =>
                setEditData({ ...editData, nombres: text })
              }
              icon="person"
            />
            <Input
              label="Apellidos"
              placeholder="Tus apellidos"
              value={editData.apellidos}
              onChangeText={(text) =>
                setEditData({ ...editData, apellidos: text })
              }
              icon="person"
            />
            <Input
              label="WhatsApp"
              placeholder="987654321"
              value={editData.whatsapp}
              onChangeText={(text) =>
                setEditData({ ...editData, whatsapp: text })
              }
              keyboardType="phone-pad"
              icon="logo-whatsapp"
            />

            <DepartamentoPicker
              value={editData.departamento}
              onSelect={(dep) => setEditData({ ...editData, departamento: dep })}
              noInnerScroll
            />

            <Input
              label="Distrito"
              placeholder="Ej: Miraflores"
              value={editData.distrito}
              onChangeText={(text) => setEditData({ ...editData, distrito: text })}
              icon="map-outline"
              autoCapitalize="words"
            />

            <Input
              label="Dirección"
              placeholder="Ej: Av. Principal 123"
              value={editData.direccion}
              onChangeText={(text) => setEditData({ ...editData, direccion: text })}
              icon="home-outline"
              autoCapitalize="sentences"
            />

            <Button
              title="Guardar Cambios"
              onPress={handleUpdateProfile}
              loading={updating}
              style={styles.submitButton}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Modal Gestionar Bancos */}
      <Modal
        visible={bancosModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
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
        </View>
      </Modal>

      {/* Modal Agregar Banco */}
      <Modal
        visible={addBancoModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
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
        </View>
      </Modal>

      {/* Modal Editar Banco */}
      <Modal
        visible={editBancoModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar Cuenta</Text>
            <TouchableOpacity onPress={() => setEditBancoModalVisible(false)}>
              <Ionicons name="close" size={28} color={Colors.accent} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} contentContainerStyle={{ paddingBottom: insets.bottom }}>
            {editingBanco && (
              <>
                <Text style={styles.label}>Banco</Text>
                <TextInput
                  style={[styles.readOnlyInput]}
                  value={`${editingBanco.banco}${editingBanco.tipo_cuenta ? ` - ${editingBanco.tipo_cuenta}` : ''}`}
                  editable={false}
                />

                <Text style={styles.label}>Número de Cuenta</Text>
                <TextInput
                  style={[styles.readOnlyInput]}
                  value={editingBanco.numero_cuenta}
                  editable={false}
                />

                <Input
                  label="CCI"
                  placeholder="20 dígitos"
                  value={editBancoData.cci}
                  onChangeText={(text) => setEditBancoData({ ...editBancoData, cci: text })}
                  keyboardType="number-pad"
                  icon="keypad"
                />
                <Input
                  label="Alias"
                  placeholder="Ej: Mi cuenta principal"
                  value={editBancoData.alias}
                  onChangeText={(text) => setEditBancoData({ ...editBancoData, alias: text })}
                  icon="create"
                />
                <Button
                  title="Guardar Cambios"
                  onPress={handleSaveEditBanco}
                  loading={editingBancoLoading}
                  style={styles.submitButton}
                />
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      <ConfirmDialog
        visible={logoutDialogVisible}
        title="Cerrar Sesión"
        message="¿Estás seguro que deseas cerrar sesión?"
        buttons={[
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cerrar Sesión', style: 'destructive', onPress: () => logout() },
        ]}
        onDismiss={() => setLogoutDialogVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },
  header: { padding: Layout.spacing.lg },
  title: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    color: Colors.accent,
  },
  userCard: {
    marginHorizontal: Layout.spacing.lg,
    marginBottom: Layout.spacing.lg,
    alignItems: 'center',
  },
  avatarContainer: { marginBottom: Layout.spacing.md },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: Layout.fontSize.xxl,
    fontWeight: 'bold',
    color: Colors.white,
  },
  userName: {
    fontSize: Layout.fontSize.xl,
    fontWeight: 'bold',
    color: Colors.accent,
    marginBottom: Layout.spacing.xs,
  },
  userEmail: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    marginBottom: Layout.spacing.md,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  editButtonText: {
    color: Colors.primary,
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
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
    marginBottom: Layout.spacing.md,
  },
  seeAllText: {
    color: Colors.primary,
    fontSize: Layout.fontSize.sm,
    fontWeight: '600',
  },
  infoCard: { gap: Layout.spacing.md },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Layout.spacing.md,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: Layout.fontSize.xs, color: Colors.gray, marginBottom: 2 },
  infoValue: { fontSize: Layout.fontSize.md, fontWeight: '600', color: Colors.text },
  emptyCard: { alignItems: 'center', paddingVertical: Layout.spacing.xl },
  emptyText: {
    fontSize: Layout.fontSize.sm,
    color: Colors.gray,
    marginTop: Layout.spacing.sm,
    marginBottom: Layout.spacing.md,
  },
  addCuentaButton: { marginTop: Layout.spacing.sm },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    padding: Layout.spacing.md,
    borderRadius: Layout.borderRadius.lg,
    marginBottom: Layout.spacing.sm,
    gap: Layout.spacing.md,
  },
  optionText: {
    flex: 1,
    fontSize: Layout.fontSize.md,
    color: Colors.text,
    fontWeight: '500',
  },
  logoutButton: { marginTop: Layout.spacing.lg },
  versionText: {
    textAlign: 'center',
    fontSize: Layout.fontSize.xs,
    color: Colors.gray,
    paddingVertical: Layout.spacing.xl,
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
  submitButton: { marginTop: Layout.spacing.md, marginBottom: Layout.spacing.xl },
  addNewButton: { marginBottom: Layout.spacing.lg },
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
  readOnlyInput: {
    backgroundColor: Colors.lightGray,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    color: Colors.gray,
    fontSize: Layout.fontSize.md,
    marginBottom: Layout.spacing.md,
    height: 48,
  },
});
