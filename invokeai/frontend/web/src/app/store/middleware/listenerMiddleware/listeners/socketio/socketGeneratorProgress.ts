import { logger } from 'app/logging/logger';
import type { AppStartListening } from 'app/store/middleware/listenerMiddleware';
import { deepClone } from 'common/util/deepClone';
import { parseify } from 'common/util/serialize';
import { $nodeExecutionStates, upsertExecutionState } from 'features/nodes/hooks/useExecutionState';
import { zNodeStatus } from 'features/nodes/types/invocation';
import { socketGeneratorProgress } from 'services/events/actions';
import { $lastCanvasProgressEvent } from 'services/events/setEventListeners';

const log = logger('socketio');

export const addGeneratorProgressEventListener = (startAppListening: AppStartListening) => {
  startAppListening({
    actionCreator: socketGeneratorProgress,
    effect: (action) => {
      const { invocation_source_id, invocation, step, total_steps, progress_image, origin } = action.payload.data;
      log.trace(parseify(action.payload), `Generator progress (${invocation.type}, ${invocation_source_id})`);

      if (origin === 'workflows') {
        const nes = deepClone($nodeExecutionStates.get()[invocation_source_id]);
        if (nes) {
          nes.status = zNodeStatus.enum.IN_PROGRESS;
          nes.progress = (step + 1) / total_steps;
          nes.progressImage = progress_image ?? null;
          upsertExecutionState(nes.nodeId, nes);
        }
      }

      if (origin === 'canvas') {
        $lastCanvasProgressEvent.set(action.payload.data);
      }
    },
  });
};
