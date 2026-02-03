import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DirectoriesSection } from '../directories-section';

const mockSetRgfxConfigDirectory = vi.fn();
const mockSetMameRomsDirectory = vi.fn();
const mockNotify = vi.fn();

let mockStoredRgfxConfigDirectory = '/home/user/.rgfx';
let mockStoredMameRomsDirectory = '/home/user/mame-roms';
let mockDefaultRgfxConfigDir = '/home/user/.rgfx';

vi.mock('../../../store/ui-store', () => ({
  useUiStore: vi.fn((selector) =>
    selector({
      rgfxConfigDirectory: mockStoredRgfxConfigDirectory,
      mameRomsDirectory: mockStoredMameRomsDirectory,
      setRgfxConfigDirectory: mockSetRgfxConfigDirectory,
      setMameRomsDirectory: mockSetMameRomsDirectory,
      stripLifespanScale: 0.6,
      setStripLifespanScale: vi.fn(),
    }),
  ),
}));

vi.mock('../../../store/app-info-store', () => ({
  useAppInfoStore: vi.fn((selector) =>
    selector({
      appInfo: {
        version: '0.0.1-test',
        defaultRgfxConfigDir: mockDefaultRgfxConfigDir,
      },
    }),
  ),
}));

vi.mock('../../../store/notification-store', () => ({
  notify: (...args: unknown[]) => mockNotify(...args),
}));

afterEach(() => {
  cleanup();
});

describe('DirectoriesSection', () => {
  let mockVerifyDirectory: ReturnType<typeof vi.fn>;
  let mockSelectDirectory: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStoredRgfxConfigDirectory = '/home/user/.rgfx';
    mockStoredMameRomsDirectory = '/home/user/mame-roms';
    mockDefaultRgfxConfigDir = '/home/user/.rgfx';

    mockVerifyDirectory = vi.fn().mockResolvedValue(true);
    mockSelectDirectory = vi.fn().mockResolvedValue(null);

    // Only mock the methods we need for this test
    (window as unknown as { rgfx: Record<string, unknown> }).rgfx = {
      verifyDirectory: mockVerifyDirectory,
      selectDirectory: mockSelectDirectory,
    };
  });

  // Helper to get input fields by label text
  const getConfigDirInput = () => screen.getByLabelText('Directory for config and logs');
  const getRomsDirInput = () => screen.getByLabelText('MAME ROMs Directory');

  describe('rendering', () => {
    it('renders section title', () => {
      render(<DirectoriesSection />);
      expect(screen.getByText('Directories')).toBeDefined();
    });

    it('renders config directory field with stored value', () => {
      render(<DirectoriesSection />);
      const input = getConfigDirInput();
      expect(input).toHaveProperty('value', '/home/user/.rgfx');
    });

    it('renders ROMs directory field with stored value', () => {
      render(<DirectoriesSection />);
      const input = getRomsDirInput();
      expect(input).toHaveProperty('value', '/home/user/mame-roms');
    });

    it('renders Save button', () => {
      render(<DirectoriesSection />);
      expect(screen.getByRole('button', { name: /save/i })).toBeDefined();
    });

    it('renders folder picker buttons', () => {
      render(<DirectoriesSection />);
      expect(
        screen.getByRole('button', { name: 'Select Directory for config and logs' }),
      ).toBeDefined();
      expect(screen.getByRole('button', { name: 'Select MAME ROMs Directory' })).toBeDefined();
    });
  });

  describe('directory picker', () => {
    it('opens directory picker for config directory', async () => {
      mockSelectDirectory.mockResolvedValue('/new/config/path');
      render(<DirectoriesSection />);

      fireEvent.click(
        screen.getByRole('button', { name: 'Select Directory for config and logs' }),
      );

      await waitFor(() => {
        expect(mockSelectDirectory).toHaveBeenCalledWith(
          'Select RGFX Config Directory',
          '/home/user/.rgfx',
        );
      });
    });

    it('updates config directory field when path is selected', async () => {
      mockSelectDirectory.mockResolvedValue('/new/config/path');
      render(<DirectoriesSection />);

      fireEvent.click(
        screen.getByRole('button', { name: 'Select Directory for config and logs' }),
      );

      await waitFor(() => {
        const input = getConfigDirInput();
        expect(input).toHaveProperty('value', '/new/config/path');
      });
    });

    it('opens directory picker for ROMs directory', async () => {
      mockSelectDirectory.mockResolvedValue('/new/roms/path');
      render(<DirectoriesSection />);

      fireEvent.click(screen.getByRole('button', { name: 'Select MAME ROMs Directory' }));

      await waitFor(() => {
        expect(mockSelectDirectory).toHaveBeenCalledWith(
          'Select MAME ROMs Directory',
          '/home/user/mame-roms',
        );
      });
    });

    it('does not update field when picker is cancelled', async () => {
      mockSelectDirectory.mockResolvedValue(null);
      render(<DirectoriesSection />);

      fireEvent.click(
        screen.getByRole('button', { name: 'Select Directory for config and logs' }),
      );

      await waitFor(() => {
        const input = getConfigDirInput();
        expect(input).toHaveProperty('value', '/home/user/.rgfx');
      });
    });
  });

  describe('validation', () => {
    it('shows error when config directory is empty on save', async () => {
      mockStoredRgfxConfigDirectory = '';
      mockDefaultRgfxConfigDir = '';
      render(<DirectoriesSection />);

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText('RGFX Config Directory is required')).toBeDefined();
      });
    });

    it('shows error when config directory does not exist', async () => {
      // Only fail config dir verification
      mockVerifyDirectory.mockImplementation((path: string) =>
        Promise.resolve(path !== '/home/user/.rgfx'),
      );
      render(<DirectoriesSection />);

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        // Should show error notification
        expect(mockNotify).toHaveBeenCalledWith('Settings not saved, fix error(s)', 'error');
      });
    });

    it('shows error when ROMs directory does not exist', async () => {
      mockVerifyDirectory.mockImplementation((path: string) =>
        Promise.resolve(path !== '/home/user/mame-roms'),
      );
      render(<DirectoriesSection />);

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockNotify).toHaveBeenCalledWith('Settings not saved, fix error(s)', 'error');
      });
    });

    it('clears error when user types in field with error', async () => {
      // Only fail config dir verification
      mockVerifyDirectory.mockImplementation((path: string) =>
        Promise.resolve(path !== '/home/user/.rgfx'),
      );
      render(<DirectoriesSection />);

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.getByText('Directory does not exist')).toBeDefined();
      });

      const input = getConfigDirInput();
      fireEvent.change(input, { target: { value: '/new/path' } });

      expect(screen.queryByText('Directory does not exist')).toBeNull();
    });
  });

  describe('saving', () => {
    it('saves directories when valid', async () => {
      render(<DirectoriesSection />);

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockSetRgfxConfigDirectory).toHaveBeenCalledWith('/home/user/.rgfx');
        expect(mockSetMameRomsDirectory).toHaveBeenCalledWith('/home/user/mame-roms');
      });
    });

    it('shows success notification when saved', async () => {
      render(<DirectoriesSection />);

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockNotify).toHaveBeenCalledWith('Settings saved', 'success');
      });
    });

    it('shows error notification when validation fails', async () => {
      mockVerifyDirectory.mockResolvedValue(false);
      render(<DirectoriesSection />);

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockNotify).toHaveBeenCalledWith('Settings not saved, fix error(s)', 'error');
      });
    });

    it('shows Saving... text while saving', async () => {
      // Use a deferred pattern to control promise resolution
      let resolveVerify!: (value: boolean) => void;
      const verifyPromise = new Promise<boolean>((resolve) => {
        resolveVerify = resolve;
      });
      mockVerifyDirectory.mockReturnValue(verifyPromise);

      render(<DirectoriesSection />);

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      // Check for saving state (button is disabled while saving)
      await waitFor(() => {
        const button = screen.getByRole('button', { name: /save/i });
        expect(button).toHaveProperty('disabled', true);
      });

      // Resolve to allow test to complete
      resolveVerify(true);
    });

    it('disables save button while saving', async () => {
      // Use a deferred pattern to control promise resolution
      let resolveVerify!: (value: boolean) => void;
      const verifyPromise = new Promise<boolean>((resolve) => {
        resolveVerify = resolve;
      });
      mockVerifyDirectory.mockReturnValue(verifyPromise);

      render(<DirectoriesSection />);

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /save/i });
        expect(button).toHaveProperty('disabled', true);
      });

      // Resolve to allow test to complete
      resolveVerify(true);
    });

    it('allows empty ROMs directory', async () => {
      mockStoredMameRomsDirectory = '';
      render(<DirectoriesSection />);

      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockSetMameRomsDirectory).toHaveBeenCalledWith('');
        expect(mockNotify).toHaveBeenCalledWith('Settings saved', 'success');
      });
    });
  });
});
