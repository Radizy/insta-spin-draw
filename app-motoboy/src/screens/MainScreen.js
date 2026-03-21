import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { shouldShowInQueue } from '../utils/queueLogic';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function MainScreen({ motoboyId, onLogout }) {
  const [motoboy, setMotoboy] = useState(null);
  const [posicao, setPosicao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState(null);
  const locationSubscription = useRef(null);

  useEffect(() => {
    fetchMotoboyAndQueue();
    const subscription = supabase
      .channel('entregadores_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entregadores' },
        (payload) => {
          // Atualiza dados se qualquer entregador mudar (para recalcular fila)
          fetchMotoboyAndQueue();
        }
      )
      .subscribe();

    registerForPushNotificationsAsync();
    startLocationTracking();

    return () => {
      supabase.removeChannel(subscription);
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  const fetchMotoboyAndQueue = async () => {
    try {
      // 1. Pega informações do motoboy atual
      const { data: me, error: myError } = await supabase
        .from('entregadores')
        .select('*')
        .eq('id', motoboyId)
        .single();

      if (myError) throw myError;
      setMotoboy(me);

      // Se o motoboy não estiver mais ativo, deslogar
      if (!me.ativo) {
        Alert.alert('Acesso Revogado', 'Sua conta foi desativada.');
        onLogout();
        return;
      }

      // 2. Calcula posição na fila incluindo validação de horários/dias (Cópia exata da Função Roteirista / TV)
      if (me.status === 'disponivel') {
        const { data: queue } = await supabase
          .from('entregadores')
          .select('id, ativo, dias_trabalho, usar_turno_padrao, turno_inicio, turno_fim, fila_posicao')
          .eq('unidade', me.unidade)
          .eq('status', 'disponivel')
          .order('fila_posicao', { ascending: true });
        
        if (queue) {
          const activeQueue = queue.filter(q => shouldShowInQueue(q) || q.id === me.id);
          const pos = activeQueue.findIndex(q => q.id === me.id) + 1;
          setPosicao(pos > 0 ? pos : '-');
        }
      } else {
        setPosicao(null);
      }
    } catch (error) {
      console.error('Erro ao buscar fila', error);
    } finally {
      setLoading(false);
    }
  };

  async function registerForPushNotificationsAsync() {
    let token;
    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        console.log('Falha ao obter token de push!');
        return;
      }
      // Pega o ExpoToken nativo
      try {
        const tokenResponse = await Notifications.getExpoPushTokenAsync({
          projectId: 'SEU_EXPO_PROJECT_ID_AQUI', // Precisamos descobrir ou omitir se for build local não linkado ao EAS. Se der erro sem ID, passamos no app.json depois.
        });
        token = tokenResponse.data;
        console.log("Expo Push Token:", token);
        
        // Salva token no Supabase
        await supabase
          .from('entregadores')
          .update({ expo_push_token: token })
          .eq('id', motoboyId);
      } catch (e) {
        console.log("Erro ao gerar token", e);
      }
    }
  }

  async function startLocationTracking() {
    let { status } = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(status);
    if (status !== 'granted') {
      console.log('Permissão de localização negada');
      return;
    }

    try {
        locationSubscription.current = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.Balanced,
              timeInterval: 15000, 
              distanceInterval: 10,
            },
            async (location) => {
              const { latitude, longitude } = location.coords;
              await supabase
                .from('entregadores')
                .update({ 
                  lat: latitude, 
                  lng: longitude, 
                  last_location_time: new Date().toISOString() 
                })
                .eq('id', motoboyId);
            }
          );
    } catch (err) {
        console.log("Erro ao iniciar rastreamento: ", err);
    }
  }

  const handleLogout = async () => {
    // Limpar token push ao deslogar para não receber notificação errada
    await supabase.from('entregadores').update({ expo_push_token: null }).eq('id', motoboyId);
    await AsyncStorage.removeItem('@motoboy_id');
    onLogout();
  };

  if (loading || !motoboy) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00D1FF" />
      </View>
    );
  }

  // Cores dinâmicas por status
  let statusColor = '#3A3A4C';
  let statusText = 'Carregando...';

  if (motoboy.status === 'disponivel') {
    statusColor = '#10B981'; // Verde
    statusText = 'Disponível na Fila';
  } else if (motoboy.status === 'chamado') {
    statusColor = '#F59E0B'; // Laranja
    statusText = 'DIRIJA-SE À EXPEDIÇÃO';
  } else if (motoboy.status === 'entregando') {
    statusColor = '#3B82F6'; // Azul
    statusText = 'Em Rota de Entrega';
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Olá, {motoboy.nome}!</Text>
        <Text style={styles.unit}>Unidade: {motoboy.unidade}</Text>
      </View>

      <View style={[styles.statusCard, { borderColor: statusColor }]}>
        <Text style={[styles.statusTitle, { color: statusColor }]}>Status Atual</Text>
        <Text style={styles.statusText}>{statusText}</Text>
      </View>

      {motoboy.status === 'disponivel' && posicao !== null && (
        <View style={styles.queueCard}>
          <Text style={styles.queueTitle}>Sua posição na fila</Text>
          <Text style={styles.queueNumber}>{posicao}º</Text>
        </View>
      )}

      {motoboy.status === 'chamado' && (
        <View style={[styles.queueCard, { backgroundColor: '#F59E0B' }]}>
          <Text style={[styles.queueNumber, { color: '#000', fontSize: 32 }]}>É SUA VEZ!</Text>
        </View>
      )}

      <View style={{ flex: 1 }} />

      {!locationPermission === 'granted' && (
        <Text style={styles.warningText}>Atenção: Acompanhamento GPS desativado.</Text>
      )}

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2E',
    padding: 24,
    paddingTop: 60, // Safe area genérica
  },
  center: {
    flex: 1,
    backgroundColor: '#1E1E2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  unit: {
    fontSize: 16,
    color: '#A0A0B0',
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: '#2A2A3C',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
    textAlign: 'center',
  },
  queueCard: {
    backgroundColor: '#2A2A3C',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
  },
  queueTitle: {
    fontSize: 18,
    color: '#A0A0B0',
    marginBottom: 8,
  },
  queueNumber: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#00D1FF',
  },
  warningText: {
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  logoutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
