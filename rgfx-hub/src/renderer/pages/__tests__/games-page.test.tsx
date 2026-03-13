import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import GamesPage from '../games-page';
import { installRgfxMock, type MockRgfxAPI } from '@/__tests__/create-rgfx-mock';
import type { GameInfo } from '@/types';

vi.mock('../../components/layout/page-title', () => ({
  PageTitle: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

const FULL_GAME: GameInfo = {
  romName: 'pacman.zip',
  interceptorName: 'pacman_rgfx.lua',
  interceptorPath: '/mock/interceptors/games/pacman_rgfx.lua',
  transformerName: 'pacman.js',
  transformerPath: '/mock/transformers/games/pacman.js',
};

const NO_TRANSFORMER: GameInfo = {
  romName: 'donkeykong.zip',
  interceptorName: 'donkeykong_rgfx.lua',
  interceptorPath: '/mock/interceptors/games/donkeykong_rgfx.lua',
  transformerName: null,
  transformerPath: null,
};

const NO_INTERCEPTOR: GameInfo = {
  romName: 'frogger.zip',
  interceptorName: null,
  interceptorPath: null,
  transformerName: 'frogger.js',
  transformerPath: '/mock/transformers/games/frogger.js',
};

const ORPHAN_INTERCEPTOR: GameInfo = {
  romName: null,
  interceptorName: 'galaga_rgfx.lua',
  interceptorPath: '/mock/interceptors/games/galaga_rgfx.lua',
  transformerName: 'galaga.js',
  transformerPath: '/mock/transformers/games/galaga.js',
};

let mockRgfx: MockRgfxAPI;

function renderPage() {
  return render(
    <MemoryRouter>
      <GamesPage />
    </MemoryRouter>,
  );
}

async function disableHideUnconfigured() {
  const toggle = await screen.findByRole('switch', { name: /hide unconfigured/i });
  fireEvent.click(toggle);
}

describe('GamesPage', () => {
  beforeEach(() => {
    mockRgfx = installRgfxMock();
  });

  describe('with MAME ROMs directory configured', () => {
    beforeEach(async () => {
      const { useUiStore } = await import('../../store/ui-store.js');
      useUiStore.setState({ mameRomsDirectory: '/mock/roms' });
      mockRgfx.listGames.mockResolvedValue([
        FULL_GAME,
        NO_TRANSFORMER,
        NO_INTERCEPTOR,
        ORPHAN_INTERCEPTOR,
      ]);
    });

    it('renders the Transformer column header', async () => {
      renderPage();

      const header = await screen.findByText('Transformer');
      expect(header).toBeDefined();
    });

    it('renders the Launch column header', async () => {
      renderPage();

      await screen.findByText('pacman_rgfx.lua');
      const header = screen.getByRole('columnheader', { name: 'Launch' });
      expect(header).toBeDefined();
    });

    it('shows launch button for games with ROM, interceptor, and transformer', async () => {
      renderPage();

      await screen.findByText('pacman_rgfx.lua');
      const buttons = screen.getAllByRole('button', { name: /Launch/ });
      expect(buttons).toHaveLength(1);
    });

    it('does not show launch button when transformer is missing', async () => {
      renderPage();
      await disableHideUnconfigured();

      await screen.findByText('donkeykong_rgfx.lua');
      // donkeykong has interceptor but no transformer — no launch button
      const rows = screen.getAllByRole('row');
      const dkRow = rows.find((r) => r.textContent.includes('donkeykong'));
      expect(dkRow?.querySelector('[role="button"]')).toBeNull();
    });

    it('does not show launch button when interceptor is missing', async () => {
      renderPage();
      await disableHideUnconfigured();

      await screen.findByText('frogger.js');
      const rows = screen.getAllByRole('row');
      const froggerRow = rows.find((r) => r.textContent.includes('frogger'));
      expect(froggerRow?.querySelector('[role="button"]')).toBeNull();
    });

    it('does not show launch button when ROM is missing (orphan interceptor)', async () => {
      mockRgfx.listGames.mockResolvedValue([FULL_GAME, ORPHAN_INTERCEPTOR]);
      renderPage();
      await disableHideUnconfigured();

      await screen.findByText('galaga_rgfx.lua');
      const launchButtons = screen.getAllByRole('button', { name: /Launch/ });
      // Only pacman should have a launch button, not galaga (no ROM)
      expect(launchButtons).toHaveLength(1);
    });

    it('calls launchMame with ROM name stripped of extension', async () => {
      renderPage();

      const button = await screen.findByRole('button', { name: /Launch/ });
      fireEvent.click(button);

      expect(mockRgfx.launchMame).toHaveBeenCalledWith('pacman');
    });

    it('hides unconfigured games by default', async () => {
      renderPage();

      await screen.findByText('pacman_rgfx.lua');
      // Games missing interceptor or transformer are hidden
      expect(screen.queryByText('donkeykong_rgfx.lua')).toBeNull();
      expect(screen.queryByText('frogger.js')).toBeNull();
    });

    it('hides orphan interceptors (no ROM) when hide unconfigured is on', async () => {
      renderPage();

      await screen.findByText('pacman_rgfx.lua');
      expect(screen.queryByText('galaga_rgfx.lua')).toBeNull();
    });
  });

  describe('without MAME ROMs directory configured', () => {
    beforeEach(async () => {
      const { useUiStore } = await import('../../store/ui-store.js');
      useUiStore.setState({ mameRomsDirectory: '' });
      mockRgfx.listGames.mockResolvedValue([ORPHAN_INTERCEPTOR]);
    });

    it('does not render the Launch column header', async () => {
      renderPage();

      await screen.findByText('galaga_rgfx.lua');
      expect(screen.queryByRole('columnheader', { name: 'Launch' })).toBeNull();
    });
  });
});
