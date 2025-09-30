# Composables

Этот каталог содержит переиспользуемые composables для управления аудио-синтезом и воспроизведением.

## Структура

### useAudioGraph.js
Управляет Web Audio API графом и всеми аудио-нодами:
- Создание и удаление AudioContext
- Управление осциллятором, фильтром, LFO, gain, panner
- Настройка кастомных волновых форм (square2, sawtooth2)
- Реактивные watchers для параметров аудио в реальном времени

**Экспортируемые методы:**
- `createAudioGraph(sampleRate)` - создаёт аудио-граф
- `deleteAudioGraph()` - очищает аудио-граф
- `setOscillators()` - создаёт и подключает осцилляторы
- `recreateAudioGraph(sampleRate)` - пересозд��ёт граф с новым sample rate
- `setupAudioWatchers(status)` - устанавливает watchers для параметров

### useOscillatorScheduler.js
Планирование частот для Web Audio API осциллятора:
- Вычисление частот из бинарных данных
- Планирование изменений частоты (immediately/linear/exponential)
- Поддержка случайных временных задержек

**Экспортируемые методы:**
- `computeFrequency(binaryValue)` - вычисляет частоту из бинарного значения
- `scheduleOscillatorValue(command, targetTime)` - планирует изменение частоты
- `planOscillatorList(startOfList, endOfList, includeRandomGap)` - планирует список частот

### useMidiScheduler.js
Планирование и воспроизведение MIDI-нот:
- Управление MIDI-сообщениями (noteOn, noteOff, pitch bend)
- Планирование нот с использованием worker-timers
- Поддержка solidMode и continuous режимов

**Экспортируемые методы:**
- `playNote(index)` - воспроизводит MIDI-ноту
- `planMidiList(startOfList, endOfList, baseIndexOffset, includeRandomGap)` - планирует список нот
- `recalculateCommands(startOfList, endOfList)` - пересчитывает команды без воспроизведения
- `clearMidiTimeouts()` - очищает все запланированные MIDI-таймауты

### usePlaybackControl.js
Основная логика воспроизведения и управления:
- Функции play/stop
- Рекурсивное перелистывание "листов" (блоков команд)
- Управление зацикливанием
- Watchers для динамического пересчёта при изменении параметров

**Экспортируемые методы:**
- `play()` - начинает воспроизведение
- `stop()` - останавливает воспроизведение
- `nextList(listID, startOfList)` - обрабатывает следующий блок команд
- `setupPlaybackWatchers(frequencyCoefficients, bynaryInSelectedBitness)` - устанавливает watchers

### useKeyboardControl.js
Управление клавиатурными событиями:
- Обработка пробела для play/stop
- Предотвращение прокрутки страницы при нажатии пробела

**Экспортируемые методы:**
- `changePlaying(event)` - переключает воспроизведение
- `preventScrollOnSpacePress(event)` - предотвращает прокрутку

## Использование

```javascript
import { useAudioGraph } from '@/composables/useAudioGraph.js'
import { useOscillatorScheduler } from '@/composables/useOscillatorScheduler.js'
import { useMidiScheduler } from '@/composables/useMidiScheduler.js'
import { usePlaybackControl } from '@/composables/usePlaybackControl.js'
import { useKeyboardControl } from '@/composables/useKeyboardControl.js'

// В компоненте
const audioGraph = useAudioGraph(settings)
const oscillatorScheduler = useOscillatorScheduler(settings, audioGraph.audioContext, audioGraph.oscillator, bynaryInSelectedBitness, frequencyCoefficients)
const midiScheduler = useMidiScheduler(settings, status, bynaryInSelectedBitness, frequencyCoefficients)
const playbackControl = usePlaybackControl(file, settings, status, audioGraph, oscillatorScheduler, midiScheduler)
useKeyboardControl(status, playbackControl.play, playbackControl.stop)

// Настройка watchers
audioGraph.setupAudioWatchers(status)
playbackControl.setupPlaybackWatchers(frequencyCoefficients, bynaryInSelectedBitness)
```

## Преимущества р��факторинга

1. **Разделение ответственности**: Каждый composable отвечает за свою область
2. **Переиспользуемость**: Composables можно использовать в других компонентах
3. **Тестируемость**: Легче писать unit-тесты для отдельных composables
4. **Читаемость**: Основной компонент стал значительно короче и понятнее
5. **Поддерживаемость**: Изменения в одной области не затрагивают другие
