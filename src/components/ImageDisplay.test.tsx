import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImageDisplay } from './ImageDisplay';
import * as fc from 'fast-check';

describe('ImageDisplay', () => {
  beforeEach(() => {
    // Mock Image constructor
    global.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      
      constructor() {
        // Use setTimeout to simulate async loading
        setTimeout(() => {
          if (this.src.includes('invalid')) {
            this.onerror?.();
          } else {
            this.onload?.();
          }
        }, 10);
      }
    } as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders loading state initially', () => {
    render(<ImageDisplay imageUrl="https://example.com/valid-image.png" />);
    expect(screen.getByTestId('image-loading')).toBeInTheDocument();
    expect(screen.getByText('Loading image...')).toBeInTheDocument();
  });

  test('renders image with valid URL', async () => {
    render(<ImageDisplay imageUrl="https://example.com/valid-image.png" />);
    
    await waitFor(() => {
      expect(screen.getByTestId('image-loaded')).toBeInTheDocument();
    });
    
    const img = screen.getByTestId('image-loaded') as HTMLImageElement;
    expect(img.src).toBe('https://example.com/valid-image.png');
  });

  test('displays error state for invalid URLs', async () => {
    render(<ImageDisplay imageUrl="https://example.com/invalid-image.png" />);
    
    await waitFor(() => {
      expect(screen.getByTestId('image-error')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Failed to load image')).toBeInTheDocument();
  });

  test('supports PNG format', async () => {
    render(<ImageDisplay imageUrl="https://example.com/valid-image.png" />);
    
    await waitFor(() => {
      const img = screen.getByTestId('image-loaded') as HTMLImageElement;
      expect(img.src).toContain('.png');
    });
  });

  test('supports JPG format', async () => {
    render(<ImageDisplay imageUrl="https://example.com/valid-image.jpg" />);
    
    await waitFor(() => {
      const img = screen.getByTestId('image-loaded') as HTMLImageElement;
      expect(img.src).toContain('.jpg');
    });
  });

  test('supports WebP format', async () => {
    render(<ImageDisplay imageUrl="https://example.com/valid-image.webp" />);
    
    await waitFor(() => {
      const img = screen.getByTestId('image-loaded') as HTMLImageElement;
      expect(img.src).toContain('.webp');
    });
  });

  test('uses custom alt text when provided', async () => {
    render(<ImageDisplay imageUrl="https://example.com/valid-image.png" alt="Custom alt text" />);
    
    await waitFor(() => {
      const img = screen.getByTestId('image-loaded') as HTMLImageElement;
      expect(img.alt).toBe('Custom alt text');
    });
  });

  test('uses default alt text when not provided', async () => {
    render(<ImageDisplay imageUrl="https://example.com/valid-image.png" />);
    
    await waitFor(() => {
      const img = screen.getByTestId('image-loaded') as HTMLImageElement;
      expect(img.alt).toBe('Conversation image');
    });
  });

  test('maintains image visibility after loading', async () => {
    const { container } = render(<ImageDisplay imageUrl="https://example.com/valid-image.png" />);
    
    await waitFor(() => {
      expect(screen.getByTestId('image-loaded')).toBeInTheDocument();
    });
    
    // Verify image remains in DOM
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img?.style.display).not.toBe('none');
  });

  test('updates when imageUrl changes', async () => {
    const { rerender } = render(<ImageDisplay imageUrl="https://example.com/valid-image1.png" />);
    
    await waitFor(() => {
      expect(screen.getByTestId('image-loaded')).toBeInTheDocument();
    });
    
    // Change the URL
    rerender(<ImageDisplay imageUrl="https://example.com/valid-image2.png" />);
    
    // Should show loading state again
    expect(screen.getByTestId('image-loading')).toBeInTheDocument();
    
    // Then load the new image
    await waitFor(() => {
      const img = screen.getByTestId('image-loaded') as HTMLImageElement;
      expect(img.src).toBe('https://example.com/valid-image2.png');
    });
  });
});

describe('Property-Based Tests', () => {
  beforeEach(() => {
    // Mock Image constructor
    global.Image = class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      src = '';
      
      constructor() {
        // Use setTimeout to simulate async loading
        setTimeout(() => {
          if (this.src.includes('invalid')) {
            this.onerror?.();
          } else {
            this.onload?.();
          }
        }, 10);
      }
    } as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * **Validates: Requirements 1.2**
   * 
   * Property 1: Image Persistence Throughout Session
   * For any conversation session, the image display element should remain visible
   * and rendered in the DOM from session start to session end.
   */
  it('Property 1: image remains visible throughout session lifecycle', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate various image URLs with supported formats
        fc.record({
          filename: fc.string({ minLength: 1, maxLength: 20 }).filter(s => s.trim().length > 0),
          format: fc.constantFrom('png', 'jpg', 'webp'),
          domain: fc.constantFrom('example.com', 'test.org', 'images.net')
        }),
        async (imageData) => {
          const imageUrl = `https://${imageData.domain}/${imageData.filename}.${imageData.format}`;
          
          // Render the image component (session start)
          const { container, unmount } = render(<ImageDisplay imageUrl={imageUrl} />);
          
          try {
            // Wait for image to load
            await waitFor(() => {
              const img = container.querySelector('img[data-testid="image-loaded"]');
              expect(img).toBeInTheDocument();
            });
            
            // Verify image is visible at session start
            const imageAtStart = container.querySelector('img[data-testid="image-loaded"]') as HTMLImageElement;
            expect(imageAtStart).toBeInTheDocument();
            expect(imageAtStart?.style.display).not.toBe('none');
            
            // Simulate time passing during conversation session
            // Check at multiple points during the session
            const checkPoints = [0.25, 0.5, 0.75, 1.0]; // 25%, 50%, 75%, 100% of session
            
            for (const checkpoint of checkPoints) {
              // Simulate time passing (in real app, this would be actual time)
              await new Promise(resolve => setTimeout(resolve, 10));
              
              // Verify image remains in DOM and visible
              const imageElement = container.querySelector('img[data-testid="image-loaded"]') as HTMLImageElement;
              expect(imageElement).toBeInTheDocument();
              expect(imageElement?.style.display).not.toBe('none');
              expect(imageElement?.getAttribute('src')).toContain(imageData.filename);
              
              // Verify the image container is also present (check for the root div)
              const containerElement = container.firstChild as HTMLElement;
              expect(containerElement).toBeInTheDocument();
              expect(containerElement).toHaveClass('relative', 'w-full', 'h-full');
            }
            
            // Verify image is still visible at session end
            const imageAtEnd = container.querySelector('img[data-testid="image-loaded"]') as HTMLImageElement;
            expect(imageAtEnd).toBeInTheDocument();
            expect(imageAtEnd?.style.display).not.toBe('none');
            expect(imageAtEnd).toBe(imageAtStart); // Same element throughout
          } finally {
            // Clean up after each test iteration
            unmount();
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30000); // 30 second timeout for async property test

  /**
   * **Validates: Requirements 1.3**
   * 
   * Property 2: Image Format Support
   * For any image URL with a supported format (PNG, JPG, WebP), the Image_Display
   * component should successfully render the image without errors.
   */
  it('Property 2: component renders any supported image format without errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate image URLs with all supported formats
        fc.record({
          // Generate URL-safe filenames (alphanumeric, hyphens, underscores)
          filename: fc.stringMatching(/^[a-zA-Z0-9_-]+$/).filter(s => s.length >= 1 && s.length <= 30),
          format: fc.constantFrom('png', 'jpg', 'jpeg', 'webp', 'PNG', 'JPG', 'JPEG', 'WEBP'),
          domain: fc.constantFrom('example.com', 'test.org', 'images.net', 'cdn.example.com'),
          // Generate URL-safe path segments
          path: fc.array(
            fc.stringMatching(/^[a-zA-Z0-9_-]+$/).filter(s => s.length >= 1 && s.length <= 10),
            { maxLength: 3 }
          )
        }),
        async (imageData) => {
          // Construct URL with optional path segments
          const pathSegment = imageData.path.length > 0 ? imageData.path.join('/') + '/' : '';
          const imageUrl = `https://${imageData.domain}/${pathSegment}${imageData.filename}.${imageData.format}`;
          
          // Render the component
          const { container, unmount } = render(<ImageDisplay imageUrl={imageUrl} />);
          
          try {
            // Wait for image to load successfully
            await waitFor(() => {
              const img = container.querySelector('img[data-testid="image-loaded"]');
              expect(img).toBeInTheDocument();
            }, { timeout: 3000 });
            
            // Verify the image element exists and has correct attributes
            const imgElement = container.querySelector('img[data-testid="image-loaded"]') as HTMLImageElement;
            expect(imgElement).toBeInTheDocument();
            expect(imgElement.src).toBe(imageUrl);
            
            // Verify no error state is shown
            const errorElement = container.querySelector('[data-testid="image-error"]');
            expect(errorElement).not.toBeInTheDocument();
            
            // Verify the image is visible (not hidden)
            expect(imgElement.style.display).not.toBe('none');
            
            // Verify the container is present (check for the root div)
            const containerElement = container.firstChild as HTMLElement;
            expect(containerElement).toBeInTheDocument();
            expect(containerElement).toHaveClass('relative', 'w-full', 'h-full');
            
            // Verify the image has proper styling for display
            expect(imgElement).toHaveClass('object-contain');
            expect(imgElement).toHaveClass('w-full');
            expect(imgElement).toHaveClass('h-full');
          } finally {
            // Clean up
            unmount();
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30000); // 30 second timeout for async property test
});
