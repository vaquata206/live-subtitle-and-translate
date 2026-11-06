import type { Settings } from '../settings';
import type { SttCallbacks, SttProvider } from './SttProvider';
import { DeepgramStt } from './deepgram';

export function createSttProvider(settings: Settings, cb: SttCallbacks): SttProvider {
  switch (settings.sttProvider) {
    case 'deepgram':
      return new DeepgramStt(
        settings.deepgramApiKey,
        { model: settings.deepgramModel, language: settings.sourceLanguage, diarize: settings.diarize },
        cb,
      );
    default:
      throw new Error(`Unsupported STT provider: ${String(settings.sttProvider)}`);
  }
}
