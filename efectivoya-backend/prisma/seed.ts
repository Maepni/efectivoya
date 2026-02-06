import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // 1. Crear configuración inicial
  console.log('📋 Creando configuración...');
  await prisma.configuracion.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      porcentaje_comision: new Decimal(5.0),
      monto_minimo_recarga: new Decimal(1000),
      monto_maximo_recarga: new Decimal(100000),
      cuenta_recaudadora_numero: '191-0123456789-0-12',
      cuenta_recaudadora_banco: 'BCP',
      cuenta_recaudadora_titular: 'EfectivoYa S.A.C.',
      mantenimiento_activo: false,
      mensaje_mantenimiento: null,
      version_minima_android: '1.0.0',
      version_minima_ios: '1.0.0',
      forzar_actualizacion: false,
      bono_referido: new Decimal(10.0),
      max_referidos_por_usuario: 10
    }
  });
  console.log('✅ Configuración creada');

  // 2. Crear admin por defecto
  console.log('👤 Creando administrador...');
  const adminPasswordHash = await bcrypt.hash('Admin123!@#', 10);
  await prisma.admin.upsert({
    where: { email: 'admin@efectivoya.com' },
    update: {},
    create: {
      email: 'admin@efectivoya.com',
      password_hash: adminPasswordHash,
      nombre: 'Administrador Principal',
      rol: 'super_admin',
      is_active: true
    }
  });
  console.log('✅ Admin creado: admin@efectivoya.com / Admin123!@#');

  // 3. Crear videos instructivos
  console.log('🎬 Creando videos instructivos...');
  const videos = [
    {
      banco: 'BCP' as const,
      youtube_url: 'https://www.youtube.com/watch?v=ejemplo_bcp',
      titulo: 'Cómo depositar en EfectivoYa desde BCP'
    },
    {
      banco: 'Interbank' as const,
      youtube_url: 'https://www.youtube.com/watch?v=ejemplo_interbank',
      titulo: 'Cómo depositar en EfectivoYa desde Interbank'
    },
    {
      banco: 'Scotiabank' as const,
      youtube_url: 'https://www.youtube.com/watch?v=ejemplo_scotiabank',
      titulo: 'Cómo depositar en EfectivoYa desde Scotiabank'
    },
    {
      banco: 'BBVA' as const,
      youtube_url: 'https://www.youtube.com/watch?v=ejemplo_bbva',
      titulo: 'Cómo depositar en EfectivoYa desde BBVA'
    }
  ];

  for (const video of videos) {
    await prisma.videoInstructivo.upsert({
      where: { banco: video.banco },
      update: { youtube_url: video.youtube_url, titulo: video.titulo },
      create: video
    });
  }
  console.log('✅ Videos instructivos creados');

  // 4. Crear términos y condiciones
  console.log('📄 Creando términos y condiciones...');
  await prisma.terminosCondiciones.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      contenido: `
# Términos y Condiciones de EfectivoYa

## 1. Aceptación de los Términos
Al acceder y utilizar la aplicación EfectivoYa, usted acepta estar sujeto a estos términos y condiciones.

## 2. Descripción del Servicio
EfectivoYa es una billetera digital que permite a los usuarios realizar recargas de saldo y retiros a cuentas bancarias propias.

## 3. Requisitos de Uso
- Ser mayor de 18 años
- Contar con DNI válido
- Tener una cuenta bancaria a nombre propio

## 4. Comisiones
- Las recargas están sujetas a una comisión del 5% sobre el monto depositado
- Los retiros a cuentas propias no tienen comisión

## 5. Responsabilidades del Usuario
- Proporcionar información veraz y actualizada
- Mantener la confidencialidad de sus credenciales
- Notificar inmediatamente cualquier uso no autorizado

## 6. Limitación de Responsabilidad
EfectivoYa no será responsable por daños indirectos, incidentales o consecuentes derivados del uso del servicio.

## 7. Modificaciones
Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios serán notificados a través de la aplicación.

## 8. Contacto
Para consultas o reclamos: soporte@efectivoya.com

Última actualización: Febrero 2026
      `.trim(),
      version: '1.0.0'
    }
  });
  console.log('✅ Términos y condiciones creados');

  // 5. Crear políticas de privacidad
  console.log('🔒 Creando políticas de privacidad...');
  await prisma.politicasPrivacidad.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      contenido: `
# Política de Privacidad de EfectivoYa

## 1. Información que Recopilamos
Recopilamos la siguiente información personal:
- Nombre completo
- DNI
- Correo electrónico
- Número de WhatsApp
- Información de cuentas bancarias

## 2. Uso de la Información
Utilizamos su información para:
- Procesar transacciones
- Verificar su identidad
- Comunicarnos con usted sobre su cuenta
- Cumplir con obligaciones legales

## 3. Protección de Datos
Implementamos medidas de seguridad técnicas y organizativas para proteger sus datos personales.

## 4. Compartir Información
No vendemos ni compartimos su información personal con terceros, excepto:
- Cuando sea requerido por ley
- Con proveedores de servicios que nos ayudan a operar

## 5. Sus Derechos
Usted tiene derecho a:
- Acceder a sus datos personales
- Rectificar información incorrecta
- Solicitar la eliminación de sus datos
- Oponerse al procesamiento de sus datos

## 6. Contacto
Para ejercer sus derechos: privacidad@efectivoya.com

Última actualización: Febrero 2026
      `.trim(),
      version: '1.0.0'
    }
  });
  console.log('✅ Políticas de privacidad creadas');

  // 6. Crear FAQs iniciales
  console.log('❓ Creando FAQs...');

  // Verificar si ya existen FAQs
  const existingFaqs = await prisma.fAQ.count();
  if (existingFaqs === 0) {
    const faqs = [
      {
        pregunta: '¿Cómo hago una recarga?',
        respuesta: 'Para recargar tu saldo: 1) Ve a la sección "Recargar", 2) Selecciona tu banco, 3) Realiza la transferencia a nuestra cuenta, 4) Sube la foto del boucher, 5) Espera la aprobación (máximo 15 minutos).',
        orden: 1,
        is_active: true
      },
      {
        pregunta: '¿Cuánto cobran de comisión?',
        respuesta: 'La comisión es del 5% sobre el monto depositado. Por ejemplo, si depositas S/. 100.00, recibirás S/. 95.00 en tu billetera.',
        orden: 2,
        is_active: true
      },
      {
        pregunta: '¿Cómo retiro mi dinero?',
        respuesta: 'Para retirar: 1) Ve a la sección "Retirar", 2) Selecciona una de tus cuentas bancarias registradas, 3) Ingresa el monto a retirar, 4) Confirma la operación. Los retiros se procesan en máximo 24 horas.',
        orden: 3,
        is_active: true
      },
      {
        pregunta: '¿Cuáles son los límites de recarga?',
        respuesta: 'El monto mínimo de recarga es S/. 1,000.00 y el máximo es S/. 100,000.00 por operación.',
        orden: 4,
        is_active: true
      },
      {
        pregunta: '¿Cómo funciona el programa de referidos?',
        respuesta: 'Comparte tu código de referido con amigos. Cuando ellos hagan su primera recarga, tanto tú como tu amigo recibirán S/. 10.00 de bono. Puedes referir hasta 10 amigos.',
        orden: 5,
        is_active: true
      },
      {
        pregunta: '¿Qué hago si mi recarga no se procesa?',
        respuesta: 'Si tu recarga no se procesa en 15 minutos, contacta a soporte por el chat de la app o escribe a soporte@efectivoya.com con tu número de operación.',
        orden: 6,
        is_active: true
      },
      {
        pregunta: '¿Es seguro usar EfectivoYa?',
        respuesta: 'Sí, utilizamos encriptación de nivel bancario, verificación de identidad y todas las operaciones requieren aprobación manual por nuestro equipo.',
        orden: 7,
        is_active: true
      }
    ];

    await prisma.fAQ.createMany({ data: faqs });
    console.log('✅ FAQs creadas');
  } else {
    console.log('⏭️  FAQs ya existen, omitiendo...');
  }

  console.log('');
  console.log('🎉 Seed completado exitosamente!');
  console.log('');
  console.log('Datos creados:');
  console.log('  - Configuración inicial (comisión 5%, límites S/. 1,000 - S/. 100,000)');
  console.log('  - Admin: admin@efectivoya.com / Admin123!@#');
  console.log('  - 4 videos instructivos (BCP, Interbank, Scotiabank, BBVA)');
  console.log('  - Términos y Condiciones v1.0.0');
  console.log('  - Políticas de Privacidad v1.0.0');
  console.log('  - 7 FAQs');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
