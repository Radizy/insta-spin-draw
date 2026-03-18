import { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, TouchableOpacity, BackHandler, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// URL principal do sistema
const WEBVIEW_URL = 'https://filalab.com.br/meu-lugar'; 

export default function App() {
  const webviewRef = useRef(null);
  const [hasError, setHasError] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState('');

  useEffect(() => {
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      // Caso receba notificação de 1º plano, se necessário
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      // Deep linking para navegar na WebView quando clicar na notificação
      const url = response.notification.request.content.data?.url;
      if (url && webviewRef.current) {
        webviewRef.current.injectJavaScript(`window.location.href = '${url}'; true;`);
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permissão de localização foi negada.');
      }
    })();
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      if (webviewRef.current) {
        webviewRef.current.goBack();
        return true;
      }
      return false;
    };
    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, []);

  const injectTokenToWebView = `
    window.EXPO_PUSH_TOKEN = '${expoPushToken}';
    window.dispatchEvent(new CustomEvent('ExpoPushTokenReceived', { detail: '${expoPushToken}' }));
    true;
  `;

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      {hasError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Sem conexão estavel com o servidor.</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              setHasError(false);
              webviewRef.current?.reload();
            }}
          >
            <Text style={styles.retryText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <WebView
          ref={webviewRef}
          source={{ uri: WEBVIEW_URL }}
          style={styles.webview}
          renderLoading={() => (
            <ActivityIndicator color="#0000ff" size="large" style={styles.loading} />
          )}
          startInLoadingState={true}
          onError={() => setHasError(true)}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            // Apenas considerar erro se o código de status for igual ou maior a 400
            if (nativeEvent.statusCode >= 400) {
              setHasError(true);
            }
          }}
          injectedJavaScript={expoPushToken ? injectTokenToWebView : ''}
          allowsInlineMediaPlayback={true}
          geolocationEnabled={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
      )}
    </View>
  );
}

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return;
    }
    try {
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: projectId || 'sua-config-eas-aqui', // Fallback caso não use EAS imediato no app solto
        })
      ).data;
      console.log('Push token:', token);
    } catch (e) {
      console.log('Error getting push token:', e);
    }
  }

  return token;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? Constants.statusBarHeight : 0,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  errorText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
    color: '#333'
  },
  retryButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16
  }
});
