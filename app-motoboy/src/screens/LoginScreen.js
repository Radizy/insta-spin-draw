import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ onLogin }) {
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const cleanPhone = telefone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      Alert.alert('Erro', 'Por favor, digite um telefone válido.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('entregadores')
        .select('*')
        .eq('ativo', true)
        .like('telefone', `%${cleanPhone}%`) // Busca com ou sem +55
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Pega todos os matches precisos
      const meusRecordes = data?.filter(e => 
        e.telefone.replace(/\D/g, '') === cleanPhone || 
        e.telefone.replace(/\D/g, '').endsWith(cleanPhone)
      );

      if (meusRecordes && meusRecordes.length > 0) {
        // Ordenação de prioridade de status: disponivel > chamado > entregando
        const statusPriority = {
          'disponivel': 1,
          'chamado': 2,
          'entregando': 3
        };

        const entregador = meusRecordes.sort((a, b) => {
          const prioA = statusPriority[a.status] || 99;
          const prioB = statusPriority[b.status] || 99;
          if (prioA !== prioB) return prioA - prioB;
          // Se empate no status, pega o mais recente
          return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
        })[0];

        await AsyncStorage.setItem('@motoboy_id', entregador.id);
        onLogin(entregador);
      } else {
        Alert.alert('Não encontrado', 'Telefone não cadastrado ou motoboy inativo no FilaLab.');
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível conectar ao servidor.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Aqui você pode trocar pelo require('../assets/logo.png') caso tenha o arquivo localmente */}
      <Text style={styles.title}>FilaLab Motoboy</Text>
      <Text style={styles.subtitle}>Acesse para ver sua posição na fila</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Seu Número de WhatsApp</Text>
        <TextInput
          style={styles.input}
          placeholder="(11) 99999-9999"
          keyboardType="phone-pad"
          value={telefone}
          onChangeText={setTelefone}
          maxLength={15}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Acessar</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E2E',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#A0A0B0',
    textAlign: 'center',
    marginBottom: 40,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    color: '#A0A0B0',
    marginBottom: 8,
    fontSize: 14,
  },
  input: {
    backgroundColor: '#2A2A3C',
    color: '#FFF',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#3A3A4C',
  },
  button: {
    backgroundColor: '#00D1FF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#1E1E2E',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
