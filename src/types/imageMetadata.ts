/**
 * Image metadata types for child-appropriate conversation images
 */

export interface ImageMetadata {
  id: string;
  filename: string;
  path: string;
  title: string;
  description: string;
  category: 'animals' | 'nature' | 'toys' | 'scenes';
  ageAppropriate: string;
  conversationTopics: string[];
  detectedObjects: string[];
  colors: string[];
  mood: string;
}

export interface ImageMetadataCollection {
  images: ImageMetadata[];
}

/**
 * Helper function to load image metadata
 */
export async function loadImageMetadata(): Promise<ImageMetadataCollection> {
  const response = await fetch('/images/metadata.json');
  if (!response.ok) {
    throw new Error('Failed to load image metadata');
  }
  return response.json();
}

/**
 * Helper function to get a random image from the collection
 */
export function getRandomImage(metadata: ImageMetadataCollection): ImageMetadata {
  const images = metadata.images;
  const randomIndex = Math.floor(Math.random() * images.length);
  return images[randomIndex];
}

/**
 * Helper function to get an image by ID
 */
export function getImageById(
  metadata: ImageMetadataCollection,
  id: string
): ImageMetadata | undefined {
  return metadata.images.find((img) => img.id === id);
}

/**
 * Helper function to get images by category
 */
export function getImagesByCategory(
  metadata: ImageMetadataCollection,
  category: ImageMetadata['category']
): ImageMetadata[] {
  return metadata.images.filter((img) => img.category === category);
}
