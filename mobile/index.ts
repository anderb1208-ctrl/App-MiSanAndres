import { registerRootComponent } from 'expo';

import App from './src/App';

// registerRootComponent llama a AppRegistry.registerComponent('main', () => App)
// y prepara el entorno tanto en Expo Go como en una build nativa.
registerRootComponent(App);
