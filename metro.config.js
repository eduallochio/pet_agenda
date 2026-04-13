const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const stubPath = path.resolve(__dirname, 'stubs/react-native-google-mobile-ads.web.js');

// Redireciona react-native-google-mobile-ads e seus internos para stub no web
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (
      moduleName === 'react-native-google-mobile-ads' ||
      moduleName.startsWith('react-native-google-mobile-ads/')
    ) {
      return { filePath: stubPath, type: 'sourceFile' };
    }
    // Bloqueia codegenNativeCommands ao vir de dentro do pacote de ads
    if (
      moduleName.includes('codegenNativeCommands') &&
      context.originModulePath.includes('react-native-google-mobile-ads')
    ) {
      return { filePath: stubPath, type: 'sourceFile' };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
