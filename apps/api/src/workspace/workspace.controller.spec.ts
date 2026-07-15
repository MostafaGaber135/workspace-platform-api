import { type Workspace } from '@developeros/shared-types';
import { type WorkspaceService } from './workspace.service';
import { WorkspaceController } from './workspace.controller';

const sample: Workspace = {
  id: 'w1',
  name: 'Alpha',
  ownerId: 'u1',
  createdAt: '2026-07-13T12:00:00.000Z',
  updatedAt: '2026-07-13T12:00:00.000Z',
};

function makeController() {
  const service = {
    create: jest.fn().mockResolvedValue(sample),
    listOwnedBy: jest.fn().mockResolvedValue([sample]),
    getOwned: jest.fn().mockResolvedValue(sample),
    rename: jest.fn().mockResolvedValue(sample),
  };
  const controller = new WorkspaceController(service as unknown as WorkspaceService);
  return { controller, service };
}

describe('WorkspaceController', () => {
  it('delegates create with the current user id and body', async () => {
    const { controller, service } = makeController();
    await controller.create('u1', { name: 'Alpha' });
    expect(service.create).toHaveBeenCalledWith('u1', { name: 'Alpha' });
  });

  it('delegates list with the current user id', async () => {
    const { controller, service } = makeController();
    await controller.list('u1');
    expect(service.listOwnedBy).toHaveBeenCalledWith('u1');
  });

  it('delegates get with the current user id and path id', async () => {
    const { controller, service } = makeController();
    await controller.get('u1', 'w1');
    expect(service.getOwned).toHaveBeenCalledWith('u1', 'w1');
  });

  it('delegates rename with the current user id, path id, and body', async () => {
    const { controller, service } = makeController();
    await controller.rename('u1', 'w1', { name: 'New' });
    expect(service.rename).toHaveBeenCalledWith('u1', 'w1', { name: 'New' });
  });
});
