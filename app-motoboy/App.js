import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './src/screens/LoginScreen';
import MainScreen from './src/screens/MainScreen';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [motoboyId, setMotoboyId] = useState(null);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const storedId = await AsyncStorage.getItem('@motoboy_id');
      if (storedId) {
        setMotoboyId(storedId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (motoboy) => {
    setMotoboyId(motoboy.id);
  };

  const handleLogout = () => {
    setMotoboyId(null);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1E1E2E', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00D1FF" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      {motoboyId ? (
        <MainScreen motoboyId={motoboyId} onLogout={handleLogout} />
      ) : (
        <LoginScreen onLogin={handleLogin} />
      )}
    </>
  );
}
