import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(() => {
    const appService = {
      getLiveness: () => ({
        status: 'ok' as const,
        service: 'geedyx-api' as const,
        timestamp: '2026-09-12T00:00:00.000Z',
      }),
      getReadiness: async () => ({
        status: 'ok' as const,
        service: 'geedyx-api' as const,
        timestamp: '2026-09-12T00:00:00.000Z',
      }),
    } satisfies Pick<AppService, 'getLiveness' | 'getReadiness'>;
    appController = new AppController(appService as AppService);
  });

  describe('health', () => {
    it('returns liveness state', () => {
      expect(appController.getLiveness()).toMatchObject({
        status: 'ok',
        service: 'geedyx-api',
      });
    });

    it('returns readiness state', async () => {
      await expect(appController.getReadiness()).resolves.toMatchObject({
        status: 'ok',
        service: 'geedyx-api',
      });
    });
  });
});
